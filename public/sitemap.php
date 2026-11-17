<?php
/**
 * Gulfaro Hostinger Dynamic Sitemap Bridge
 *
 * Serves a live XML sitemap directly at https://www.gulfaro.net/sitemap.xml (HTTP 200)
 * by fetching fresh XML from the Gulfaro backend API (which includes newly published jobs
 * and excludes deleted/unpublished/expired jobs and private/admin pages), with automatic
 * temp caching and static fallback so /sitemap.xml never fails or renders the homepage HTML.
 */

@ini_set('display_errors', '0');

$upstreamUrl = 'https://gulfaro.onrender.com/sitemap.xml';
$cacheFile = rtrim(sys_get_temp_dir(), '/\\') . '/gulfaro-sitemap-cache.xml';
$fallbackFile = __DIR__ . '/sitemap.xml';

function gulfaro_is_valid_sitemap_xml($body) {
    return is_string($body)
        && strlen($body) > 100
        && strpos($body, '<?xml') !== false
        && strpos($body, '<urlset') !== false
        && strpos($body, '</urlset>') !== false;
}

$xml = '';

// 1. Fetch live sitemap from backend API via cURL
if (function_exists('curl_init')) {
    $ch = curl_init($upstreamUrl);
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_HTTPHEADER => array(
            'Accept: application/xml, text/xml;q=0.9',
            'User-Agent: Gulfaro-Hostinger-Sitemap/1.0'
        )
    ));
    $resp = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($status === 200 && gulfaro_is_valid_sitemap_xml($resp)) {
        $xml = $resp;
    }
}

// 2. Fallback HTTP fetch if cURL extension is unavailable
if ($xml === '' && ini_get('allow_url_fopen')) {
    $ctx = stream_context_create(array(
        'http' => array(
            'method' => 'GET',
            'timeout' => 12,
            'header' => "Accept: application/xml\r\nUser-Agent: Gulfaro-Hostinger-Sitemap/1.0\r\n"
        )
    ));
    $resp = @file_get_contents($upstreamUrl, false, $ctx);
    if (gulfaro_is_valid_sitemap_xml($resp)) {
        $xml = $resp;
    }
}

// 3. Persist fresh cache when live fetch succeeds; otherwise fall back to cache or static baseline
if ($xml !== '') {
    @file_put_contents($cacheFile, $xml, LOCK_EX);
} elseif (is_readable($cacheFile)) {
    $cached = @file_get_contents($cacheFile);
    if (gulfaro_is_valid_sitemap_xml($cached)) {
        $xml = $cached;
    }
}

if ($xml === '' && is_readable($fallbackFile)) {
    $fallback = @file_get_contents($fallbackFile);
    if (gulfaro_is_valid_sitemap_xml($fallback)) {
        $xml = $fallback;
    }
}

if ($xml === '') {
    $today = gmdate('Y-m-d');
    $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
         . "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
         . "  <url>\n"
         . "    <loc>https://www.gulfaro.net/</loc>\n"
         . "    <lastmod>{$today}</lastmod>\n"
         . "    <changefreq>daily</changefreq>\n"
         . "    <priority>1.0</priority>\n"
         . "  </url>\n"
         . "</urlset>";
}

http_response_code(200);
header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=120, must-revalidate');
header('X-Content-Type-Options: nosniff');
echo $xml;
