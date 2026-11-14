<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const ROOT = __DIR__;
const CONFIG = __DIR__ . '/data/panel-config.php';
const DEFAULT_PASSWORD = 'lepavlove1234';
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_VIDEO = 60 * 1024 * 1024;

function reply(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $code = 400): void
{
    reply(['ok' => false, 'error' => $message], $code);
}

function config(): array
{
    if (is_file(CONFIG)) {
        $c = include CONFIG;
        if (is_array($c) && !empty($c['hash']) && !empty($c['secret'])) {
            return $c;
        }
    }
    $c = ['hash' => password_hash(DEFAULT_PASSWORD, PASSWORD_DEFAULT), 'secret' => bin2hex(random_bytes(32)), 'default' => true];
    save_config($c);
    return $c;
}

function save_config(array $c): void
{
    if (!is_dir(dirname(CONFIG))) {
        mkdir(dirname(CONFIG), 0755, true);
    }
    if (file_put_contents(CONFIG, "<?php\nreturn " . var_export($c, true) . ";\n", LOCK_EX) === false) {
        fail('No se pudo guardar la configuración del panel. Revisa los permisos de la carpeta data.', 500);
    }
}

function token(array $c, int $days): string
{
    $exp = time() + $days * 86400;
    return $exp . '.' . hash_hmac('sha256', (string) $exp, $c['secret']);
}

function valid_token(array $c, string $t): bool
{
    $parts = explode('.', $t, 2);
    if (count($parts) !== 2 || !ctype_digit($parts[0]) || (int) $parts[0] < time()) {
        return false;
    }
    return hash_equals(hash_hmac('sha256', $parts[0], $c['secret']), $parts[1]);
}

function throttle_file(): string
{
    return sys_get_temp_dir() . '/lp-panel-' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . __DIR__) . '.json';
}

function throttle_check(): void
{
    $f = throttle_file();
    $s = is_file($f) ? json_decode((string) file_get_contents($f), true) : null;
    if (is_array($s) && $s['count'] >= 5 && time() - $s['since'] < 900) {
        fail('Demasiados intentos. Espera unos minutos y vuelve a probar.', 429);
    }
}

function throttle_fail(): void
{
    $f = throttle_file();
    $s = is_file($f) ? json_decode((string) file_get_contents($f), true) : null;
    if (!is_array($s) || time() - $s['since'] >= 900) {
        $s = ['count' => 0, 'since' => time()];
    }
    $s['count']++;
    file_put_contents($f, json_encode($s), LOCK_EX);
}

function write_atomic(string $target, string $data): void
{
    $dir = dirname($target);
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        fail('No se pudo crear la carpeta ' . basename($dir) . '. Revisa los permisos.', 500);
    }
    $tmp = $dir . '/.tmp-' . bin2hex(random_bytes(6));
    if (file_put_contents($tmp, $data, LOCK_EX) === false || !rename($tmp, $target)) {
        @unlink($tmp);
        fail('No se pudo guardar el archivo. Revisa los permisos de la carpeta.', 500);
    }
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$c = config();
$sent = $_SERVER['HTTP_X_PANEL_TOKEN'] ?? '';
$logged = $sent !== '' && valid_token($c, $sent);

if ($action === 'status') {
    reply(['ok' => true, 'logged' => $logged, 'default' => !empty($c['default'])]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || ($_SERVER['HTTP_X_PANEL'] ?? '') !== '1') {
    fail('Petición no válida.');
}

if ($action === 'login') {
    throttle_check();
    if (!password_verify((string) ($_POST['password'] ?? ''), $c['hash'])) {
        throttle_fail();
        sleep(1);
        fail('Contraseña incorrecta.', 401);
    }
    @unlink(throttle_file());
    reply(['ok' => true, 'token' => token($c, !empty($_POST['remember']) ? 30 : 1), 'default' => !empty($c['default'])]);
}

if (!$logged) {
    fail('Tu sesión ha caducado. Vuelve a entrar.', 401);
}

if ($action === 'password') {
    if (!password_verify((string) ($_POST['old'] ?? ''), $c['hash'])) {
        fail('La contraseña actual no es correcta.', 401);
    }
    $new = (string) ($_POST['new'] ?? '');
    if (mb_strlen($new) < 8) {
        fail('La contraseña nueva debe tener al menos 8 caracteres.');
    }
    $c = ['hash' => password_hash($new, PASSWORD_DEFAULT), 'secret' => bin2hex(random_bytes(32))];
    save_config($c);
    reply(['ok' => true, 'token' => token($c, 30)]);
}

if ($action === 'save') {
    $path = (string) ($_POST['path'] ?? '');
    $isContent = $path === 'data/content.json';
    $isImage = (bool) preg_match('#^assets/img/uploads/[a-z0-9-]+\.(webp|png|jpg)$#', $path);
    $isVideo = (bool) preg_match('#^assets/video/uploads/[a-z0-9-]+\.(mp4|webm|mov)$#', $path);
    if (!$isContent && !$isImage && !$isVideo) {
        fail('Ruta no permitida.');
    }
    $file = $_FILES['file'] ?? null;
    if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        $err = $file['error'] ?? UPLOAD_ERR_NO_FILE;
        fail(in_array($err, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)
            ? 'El archivo es demasiado grande para el servidor. Prueba con uno más ligero.'
            : 'No ha llegado el archivo. Inténtalo de nuevo.');
    }
    $limit = $isVideo ? MAX_VIDEO : MAX_IMAGE;
    if ($file['size'] > $limit) {
        fail('El archivo es demasiado grande.');
    }
    $data = (string) file_get_contents($file['tmp_name']);
    if ($isContent) {
        $json = json_decode($data, true);
        if (!is_array($json) || !isset($json['site'])) {
            fail('El contenido no es válido.');
        }
    }
    write_atomic(ROOT . '/' . $path, $data);
    reply(['ok' => true]);
}

fail('Acción desconocida.');
