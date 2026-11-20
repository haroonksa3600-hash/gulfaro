<?php
/**
 * Gulfaro Hostinger Dynamic /llms.txt Bridge
 *
 * Serves live /llms.txt (HTTP 200, Content-Type: text/plain; charset=utf-8)
 * by fetching fresh content from https://gulfaro.onrender.com/llms.txt with
 * local temp caching and guaranteed static fallback to public/llms.txt.
 */

@ini_set('display_errors', '0');

$upstreamUrl = 'https://gulfaro.onrender.com/llms.txt';
$cacheFile = rtrim(sys_get_temp_dir(), '/\\') . '/gulfaro-llms-txt-cache.txt';
$fallbackFile = __DIR__ . '/llms.txt';

function gulfaro_is_valid_llms_txt($body) {
    return is_string($body)
        && strlen($body) > 50
        && stripos($body, '<!doctype') === false
        && stripos($body, '<html') === false
        && strpos($body, '# Gulfaro') !== false
        && strpos($body, '>') !== false;
}

$content = '';

if (function_exists('curl_init')) {
    $ch = curl_init($upstreamUrl);
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_HTTPHEADER => array(
            'Accept: text/plain, text/markdown;q=0.9',
            'User-Agent: Gulfaro-Hostinger-LLMsTxt/1.0'
        )
    ));
    $resp = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($status === 200 && gulfaro_is_valid_llms_txt($resp)) {
        $content = $resp;
    }
}

if ($content === '' && ini_get('allow_url_fopen')) {
    $ctx = stream_context_create(array(
        'http' => array(
            'method' => 'GET',
            'timeout' => 8,
            'header' => "Accept: text/plain\r\nUser-Agent: Gulfaro-Hostinger-LLMsTxt/1.0\r\n"
        )
    ));
    $resp = @file_get_contents($upstreamUrl, false, $ctx);
    if (gulfaro_is_valid_llms_txt($resp)) {
        $content = $resp;
    }
}

if ($content !== '') {
    @file_put_contents($cacheFile, $content, LOCK_EX);
} elseif (is_readable($cacheFile)) {
    $cached = @file_get_contents($cacheFile);
    if (gulfaro_is_valid_llms_txt($cached)) {
        $content = $cached;
    }
}

if ($content === '' && is_readable($fallbackFile)) {
    $fallback = @file_get_contents($fallbackFile);
    if (gulfaro_is_valid_llms_txt($fallback)) {
        $content = $fallback;
    }
}

if ($content === '') {
    $content = "# Gulfaro\n\n> Gulfaro is a modern GCC job marketplace connecting skilled talent with employers across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman.\n\n- [Gulfaro Homepage](https://www.gulfaro.net/)\n";
}

http_response_code(200);
header('Content-Type: text/plain; charset=utf-8');
header('Link: </llms.txt>; rel="alternate"; type="text/plain"; title="llms.txt", </index.md>; rel="alternate"; type="text/markdown"; title="Markdown"');
header('Vary: Accept');
header('Cache-Control: public, max-age=120, must-revalidate');
header('X-Content-Type-Options: nosniff');
echo $content;
