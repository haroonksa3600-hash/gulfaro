<?php
/**
 * Gulfaro Hostinger SPA Route Validator & Dynamic 404 Handler
 *
 * Validates every frontend route on https://www.gulfaro.net:
 *  - Known static/portal pages -> HTTP 200 (index.html)
 *  - Valid GCC country / category / career-advice slugs -> HTTP 200 (index.html)
 *  - Shared job URLs (/job/:slugOrId, /jobs/:slugOrId, /?job=...) -> checks live Render backend:
 *      * 200 -> HTTP 200 + SSR job & SEO tags
 *      * 404 -> HTTP 404 + window.__JOB_NOT_FOUND__ = true
 *      * unreachable/5xx -> fail-open HTTP 200 so React client retry resolves the job
 *  - Any genuinely missing/invalid URL -> genuine HTTP 404 + 404 SEO tags + window.__ROUTE_NOT_FOUND__ = true
 */

@ini_set('display_errors', '0');

$linkHeader = '</llms.txt>; rel="alternate"; type="text/plain"; title="llms.txt", </index.md>; rel="alternate"; type="text/markdown"; title="Markdown"';
$indexFile = __DIR__ . '/index.html';

function gulfaro_escape_html($str) {
    return htmlspecialchars((string) $str, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function gulfaro_render_spa_html($indexFile, $status, $linkHeader, $seoOverride = null, $ssrScript = '') {
    if (!is_readable($indexFile)) {
        http_response_code($status);
        header('Content-Type: text/plain; charset=utf-8');
        echo $status === 404 ? "404 Not Found\n" : "Service temporarily unavailable\n";
        exit;
    }

    $html = file_get_contents($indexFile);
    if (!is_string($html)) {
        $html = '';
    }

    if (is_array($seoOverride)) {
        $title = gulfaro_escape_html($seoOverride['title'] ?? 'Gulfaro');
        $description = gulfaro_escape_html($seoOverride['description'] ?? '');
        $robots = gulfaro_escape_html($seoOverride['robots'] ?? 'index, follow');
        $canonical = gulfaro_escape_html($seoOverride['canonical'] ?? 'https://www.gulfaro.net/');

        $html = preg_replace('/<title>[\s\S]*?<\/title>/i', '<title>' . $title . '</title>', $html, 1);
        $html = preg_replace('/<meta\s+name="description"[^>]*>/i', '', $html);
        $html = preg_replace('/<meta\s+name="robots"[^>]*>/i', '', $html);
        $html = preg_replace('/<link\s+rel="canonical"[^>]*>/i', '', $html);
        $html = preg_replace('/<meta\s+property="og:(title|description|url)"[^>]*>/i', '', $html);
        $html = preg_replace('/<meta\s+name="twitter:(title|description)"[^>]*>/i', '', $html);
        if (!empty($seoOverride['stripJsonLd'])) {
            $html = preg_replace('/<script\s+id="gulfaro-route-jsonld"[^>]*>[\s\S]*?<\/script>/i', '', $html);
        }

        $seoBlock = "\n    <meta name=\"description\" content=\"{$description}\" />"
                  . "\n    <meta name=\"robots\" content=\"{$robots}\" />"
                  . "\n    <link rel=\"canonical\" href=\"{$canonical}\" />"
                  . "\n    <meta property=\"og:title\" content=\"{$title}\" />"
                  . "\n    <meta property=\"og:description\" content=\"{$description}\" />"
                  . "\n    <meta property=\"og:url\" content=\"{$canonical}\" />"
                  . "\n    <meta name=\"twitter:title\" content=\"{$title}\" />"
                  . "\n    <meta name=\"twitter:description\" content=\"{$description}\" />";

        $html = str_replace('</head>', $seoBlock . "\n  </head>", $html);
    }

    if ($ssrScript !== '') {
        $html = str_replace('</head>', "\n    " . $ssrScript . "\n  </head>", $html);
    }

    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    header('Link: ' . $linkHeader);
    header('Vary: Accept');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('X-Content-Type-Options: nosniff');
    echo $html;
    exit;
}

function gulfaro_render_404($indexFile, $linkHeader, $pathname) {
    $safePathJson = json_encode($pathname, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    $script = "<script id=\"gulfaro-ssr-data\">window.__ROUTE_NOT_FOUND__ = true; window.__REQUESTED_PATH__ = {$safePathJson};</script>";
    gulfaro_render_spa_html(
        $indexFile,
        404,
        $linkHeader,
        array(
            'title' => '404 – Page Not Found | Gulfaro',
            'description' => 'The requested page could not be found on Gulfaro. Return to the homepage to browse active GCC job vacancies.',
            'robots' => 'noindex, nofollow',
            'canonical' => 'https://www.gulfaro.net' . $pathname,
            'stripJsonLd' => true
        ),
        $script
    );
}

$rawUri = $_SERVER['REQUEST_URI'] ?? '/';
$rawPath = parse_url($rawUri, PHP_URL_PATH) ?: '/';
$pathname = rtrim($rawPath, '/');
if ($pathname === '') {
    $pathname = '/';
}
$lowerPath = strtolower($pathname);

// 1. Legacy /admin redirect
if ($lowerPath === '/admin' || strpos($lowerPath, '/admin/') === 0) {
    header('Location: https://www.gulfaro.net/super-admin', true, 302);
    exit;
}

// 2. Job detail routes: /job/:slugOrId, /jobs/:slugOrId, or /?job=...
$targetSlugOrId = '';
if (preg_match('#^/jobs?/([^/]+)$#i', $pathname, $jobMatch)) {
    $targetSlugOrId = urldecode($jobMatch[1]);
} elseif ($pathname === '/') {
    $queryJob = $_GET['job'] ?? ($_GET['id'] ?? ($_GET['ref'] ?? ''));
    if (is_string($queryJob) && trim($queryJob) !== '') {
        $targetSlugOrId = trim($queryJob);
    }
}

if ($targetSlugOrId !== '') {
    $cleanSlug = preg_replace('/\.html$/i', '', trim($targetSlugOrId));
    if ($cleanSlug === '' || strtolower($cleanSlug) === 'all') {
        gulfaro_render_404($indexFile, $linkHeader, $pathname);
    }

    $apiUrl = 'https://gulfaro.onrender.com/api/jobs/' . rawurlencode($cleanSlug);
    $status = 0;
    $resp = '';

    if (function_exists('curl_init')) {
        $ch = curl_init($apiUrl);
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 7,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER => array(
                'Accept: application/json',
                'User-Agent: Gulfaro-Hostinger-Router/1.0'
            )
        ));
        $resp = (string) curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    }

    if ($status === 200) {
        $decoded = json_decode($resp, true);
        if (is_array($decoded) && !empty($decoded['id'])) {
            $slugOrId = $decoded['slug'] ?: $decoded['id'];
            $companySuffix = !empty($decoded['company']) ? ' – ' . $decoded['company'] : '';
            $cityPart = trim((string) ($decoded['city'] ?? ''));
            $countryPart = trim((string) ($decoded['country'] ?? 'GCC'));
            $locLabel = $cityPart !== '' ? ($cityPart . ', ' . $countryPart) : $countryPart;
            $descClean = trim(preg_replace('/\s+/', ' ', (string) ($decoded['description'] ?? '')));
            if (strlen($descClean) > 155) {
                $descClean = substr($descClean, 0, 152) . '...';
            }
            $jobJson = json_encode($decoded, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
            $slugJson = json_encode($cleanSlug, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
            $script = "<script id=\"gulfaro-ssr-data\">window.__INITIAL_JOB__ = {$jobJson}; window.__REQUESTED_JOB_SLUG__ = {$slugJson};</script>";
            $isActive = (($decoded['status'] ?? '') === 'active');
            gulfaro_render_spa_html(
                $indexFile,
                200,
                $linkHeader,
                array(
                    'title' => ($decoded['title'] ?? 'Job Opportunity') . $companySuffix . " ({$locLabel}) | Gulfaro",
                    'description' => $descClean !== '' ? $descClean : (($decoded['title'] ?? 'Job') . " in {$locLabel} on Gulfaro."),
                    'robots' => $isActive ? 'index, follow' : 'noindex, follow',
                    'canonical' => 'https://www.gulfaro.net/job/' . rawurlencode((string) $slugOrId),
                    'stripJsonLd' => false
                ),
                $script
            );
        }
    }

    if ($status === 404) {
        $decodedErr = json_decode($resp, true);
        if (is_array($decodedErr)) {
            $slugJson = json_encode($cleanSlug, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
            $script = "<script id=\"gulfaro-ssr-data\">window.__JOB_NOT_FOUND__ = true; window.__REQUESTED_JOB_SLUG__ = {$slugJson};</script>";
            gulfaro_render_spa_html(
                $indexFile,
                404,
                $linkHeader,
                array(
                    'title' => '404 – Job Advertisement Not Found | Gulfaro',
                    'description' => 'The requested job listing is no longer available or has expired. Browse active GCC opportunities on Gulfaro.',
                    'robots' => 'noindex, follow',
                    'canonical' => 'https://www.gulfaro.net' . $pathname,
                    'stripJsonLd' => true
                ),
                $script
            );
        }
    }

    // Fail-open on cold start / timeout / 5xx so client React app can retry /api/jobs/:slug
    gulfaro_render_spa_html($indexFile, 200, $linkHeader);
}

// 3. Static valid SPA routes
$staticValidRoutes = array(
    '/',
    '/countries',
    '/categories',
    '/career-advice',
    '/about',
    '/contact',
    '/privacy-policy',
    '/terms',
    '/disclaimer',
    '/cookie-policy',
    '/post-job',
    '/post',
    '/my-job-posts',
    '/manage-jobs',
    '/forgot-password',
    '/reset-password',
    '/unauthorized',
    '/super-admin'
);

if (in_array($lowerPath, $staticValidRoutes, true) || strpos($lowerPath, '/super-admin/') === 0) {
    gulfaro_render_spa_html($indexFile, 200, $linkHeader);
}

// 4. GCC country portal routes (/country/:slug)
if (preg_match('#^/country/([^/]+)$#i', $pathname, $m)) {
    $slug = strtolower(urldecode($m[1]));
    $validCountries = array(
        'saudi-arabia',
        'uae',
        'united-arab-emirates',
        'qatar',
        'kuwait',
        'bahrain',
        'oman'
    );
    if (in_array($slug, $validCountries, true)) {
        gulfaro_render_spa_html($indexFile, 200, $linkHeader);
    }
    gulfaro_render_404($indexFile, $linkHeader, $pathname);
}

// 5. Job category portal routes (/category/:slug)
if (preg_match('#^/category/([^/]+)$#i', $pathname, $m)) {
    $slug = strtolower(urldecode($m[1]));
    $validCategories = array(
        'accounting-finance',
        'administration-office-support',
        'engineering',
        'construction-building',
        'information-technology',
        'sales-business-development',
        'marketing-advertising',
        'human-resources',
        'healthcare-medical',
        'education-training',
        'hospitality-tourism',
        'restaurant-food-services',
        'customer-service-call-center',
        'driving-transportation',
        'logistics-supply-chain',
        'security-safety',
        'oil-gas-energy',
        'manufacturing-production',
        'retail-supermarket',
        'cleaning-maintenance',
        'electrical-mechanical',
        'architecture-interior-design',
        'legal-compliance',
        'real-estate-property-management',
        'procurement-purchasing',
        'quality-control-assurance',
        'media-design-creative',
        'telecommunications',
        'agriculture-farming',
        'other-jobs',
        // Legacy category slug aliases supported by resolveJobCategoryId
        'engineering-construction',
        'construction',
        'it-software',
        'sales-marketing',
        'sales-and-marketing',
        'admin-hr-pro',
        'administration',
        'logistics-drivers',
        'transportation-and-logistics',
        'hospitality',
        'education-teaching',
        'education',
        'customer-support',
        'skilled-trades',
        'accounting-and-finance',
        'manufacturing',
        'general',
        'other',
        'others'
    );
    if (in_array($slug, $validCategories, true)) {
        gulfaro_render_spa_html($indexFile, 200, $linkHeader);
    }
    gulfaro_render_404($indexFile, $linkHeader, $pathname);
}

// 6. Career advice article routes (/career-advice/:slug)
if (preg_match('#^/career-advice/([^/]+)$#i', $pathname, $m)) {
    $slug = strtolower(urldecode($m[1]));
    $validArticles = array(
        'how-to-find-a-job-in-saudi-arabia',
        'how-to-prepare-a-professional-cv',
        'common-interview-questions-and-answers',
        'job-search-tips-for-gcc-countries',
        'understanding-employment-contracts',
        'professional-skills-employers-look-for',
        'how-to-prepare-for-a-job-interview-in-the-uae'
    );
    if (in_array($slug, $validArticles, true)) {
        gulfaro_render_spa_html($indexFile, 200, $linkHeader);
    }
    gulfaro_render_404($indexFile, $linkHeader, $pathname);
}

// 7. All other genuinely missing routes -> real HTTP 404
gulfaro_render_404($indexFile, $linkHeader, $pathname);
