<?php
/**
 * Gulfaro Hostinger Homepage Markdown Content-Negotiation Bridge
 *
 * Handles:
 *  - GET / with Accept: text/markdown (RFC 9110 q-value aware)
 *  - GET /index.md
 * Fetches live Markdown from https://gulfaro.onrender.com/index.md with
 * local temp caching and static fallback to public/index.md.
 */

@ini_set('display_errors', '0');

function gulfaro_prefers_markdown($acceptHeader) {
    $raw = trim((string) $acceptHeader);
    if ($raw === '') {
        return false;
    }

    $markdownQ = -1.0;
    $htmlQ = -1.0;

    foreach (explode(',', $raw) as $part) {
        $segments = array_map('trim', explode(';', trim($part)));
        $media = strtolower($segments[0] ?? '');
        if ($media === '') {
            continue;
        }

        $q = 1.0;
        for ($i = 1; $i < count($segments); $i++) {
            if (preg_match('/^q\s*=\s*([0-9]*\.?[0-9]+)$/i', $segments[$i], $m)) {
                $q = max(0.0, min(1.0, (float) $m[1]));
            }
        }

        if ($media === 'text/markdown' || $media === 'text/x-markdown') {
            $markdownQ = max($markdownQ, $q);
        } elseif ($media === 'text/html' || $media === 'application/xhtml+xml') {
            $htmlQ = max($htmlQ, $q);
        }
    }

    if ($markdownQ <= 0.0) {
        return false;
    }
    if ($htmlQ < 0.0) {
        return true;
    }
    return $markdownQ >= $htmlQ;
}

function gulfaro_is_valid_markdown($body) {
    return is_string($body)
        && strlen($body) > 50
        && stripos($body, '<!doctype') === false
        && stripos($body, '<html') === false
        && strpos($body, '# Gulfaro') !== false;
}

$linkHeader = '</llms.txt>; rel="alternate"; type="text/plain"; title="llms.txt", </index.md>; rel="alternate"; type="text/markdown"; title="Markdown"';

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$isExplicitMarkdown = ($requestPath === '/index.md') || (($_GET['format'] ?? '') === 'markdown');
$acceptHeader = $_SERVER['HTTP_ACCEPT'] ?? '';

if (!$isExplicitMarkdown && !gulfaro_prefers_markdown($acceptHeader)) {
    $htmlFile = __DIR__ . '/index.html';
    if (is_readable($htmlFile)) {
        http_response_code(200);
        header('Content-Type: text/html; charset=utf-8');
        header('Link: ' . $linkHeader);
        header('Vary: Accept');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        readfile($htmlFile);
        exit;
    }
}

$upstreamUrl = 'https://gulfaro.onrender.com/index.md';
$cacheFile = rtrim(sys_get_temp_dir(), '/\\') . '/gulfaro-homepage-cache.md';
$fallbackFile = __DIR__ . '/index.md';
$markdown = '';

if (function_exists('curl_init')) {
    $ch = curl_init($upstreamUrl);
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_HTTPHEADER => array(
            'Accept: text/markdown, text/plain;q=0.9',
            'User-Agent: Gulfaro-Hostinger-Markdown/1.0'
        )
    ));
    $resp = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($status === 200 && gulfaro_is_valid_markdown($resp)) {
        $markdown = $resp;
    }
}

if ($markdown === '' && ini_get('allow_url_fopen')) {
    $ctx = stream_context_create(array(
        'http' => array(
            'method' => 'GET',
            'timeout' => 8,
            'header' => "Accept: text/markdown\r\nUser-Agent: Gulfaro-Hostinger-Markdown/1.0\r\n"
        )
    ));
    $resp = @file_get_contents($upstreamUrl, false, $ctx);
    if (gulfaro_is_valid_markdown($resp)) {
        $markdown = $resp;
    }
}

if ($markdown !== '') {
    @file_put_contents($cacheFile, $markdown, LOCK_EX);
} elseif (is_readable($cacheFile)) {
    $cached = @file_get_contents($cacheFile);
    if (gulfaro_is_valid_markdown($cached)) {
        $markdown = $cached;
    }
}

if ($markdown === '' && is_readable($fallbackFile)) {
    $fallback = @file_get_contents($fallbackFile);
    if (gulfaro_is_valid_markdown($fallback)) {
        $markdown = $fallback;
    }
}

if ($markdown === '') {
    $markdown = "# Gulfaro\n\n> Direct Job Opportunities Across Saudi Arabia, UAE & The Gulf.\n\n- [Gulfaro Homepage](https://www.gulfaro.net/)\n- [llms.txt](https://www.gulfaro.net/llms.txt)\n";
}

http_response_code(200);
header('Content-Type: text/markdown; charset=utf-8');
header('Link: ' . $linkHeader);
header('Vary: Accept');
header('Cache-Control: public, max-age=120, must-revalidate');
header('X-Content-Type-Options: nosniff');
echo $markdown;
