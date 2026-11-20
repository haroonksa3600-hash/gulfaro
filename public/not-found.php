<?php
/**
 * Gulfaro Hostinger 404 Endpoint for Missing Non-HTML Resources
 *
 * Ensures missing /.well-known/* paths (e.g. /.well-known/mcp/server-card.json),
 * /api/* endpoints, and missing static files return a genuine HTTP 404 instead
 * of falling through to the SPA homepage.
 */

@ini_set('display_errors', '0');

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$type = $_GET['type'] ?? '';
$accept = $_SERVER['HTTP_ACCEPT'] ?? '';

$wantsJson =
    $type === 'json' ||
    $type === 'well-known' ||
    preg_match('/\.json$/i', $requestPath) ||
    stripos($accept, 'application/json') !== false;

http_response_code(404);
header('Cache-Control: no-cache, no-store, must-revalidate');
header('X-Content-Type-Options: nosniff');

if ($wantsJson) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array(
        'error' => 'Not Found',
        'path' => $requestPath
    ));
    exit;
}

header('Content-Type: text/plain; charset=utf-8');
echo "404 Not Found\n";
