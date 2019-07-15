<?php
error_reporting(0);

header('Cache-Control: no-store, no-cache, must-revalidate');
header('Cache-Control: post-check=0, pre-check=0', FALSE);
header('Pragma: no-cache');

$myCat = $_GET['cat'];
$myNum = $_GET['num'];
$myState = $_GET['state'];
$mySum = $_GET['sum'];
if (!isset($myCat) || !isset($myNum) || !isset($myState) || !isset($mySum)) {
	return;
}
if (strlen($myCat) > 32 || strlen($myNum) > 10 || strlen($myState) > 10 || strlen($mySum) > 40) {
	return;
}
// パスワード文字列は修正必須です。このままだとエラーになります。
// ジュークボックス・スキルのプログラムと同じパスワードをシングルクォートで囲ってください。
$sum = sha1(あなたのプログラム専用のパスワード文字列をここへ.'cat'.$myCat.'num'.$myNum.'state'.$myState);
if ($sum != $mySum) {
	return;
}
$dif = time() - intval($myState);
if ($dif < -10 || $dif > 900) {
	return;
}

$target = '';
if (strcmp($myCat, 'all') == 0) {
	$target = '*/*/';
}
else if (strcmp($myCat, 'JPOP') == 0
		|| strcmp($myCat, 'WMUSIC') == 0) {
	$target = $myCat.'/*/';
}
else {
	$target = '*/'.$myCat.'*/';
}
if (strcmp($target, '') == 0) {
	return;
}

$files = glob('data/'.$target.'*.mp3');
$file = $files[intval($myNum) % count($files)];

header('Content-Type: audio/mpeg');
header('Content-Length: '.filesize($file));

readfile($file);
?>
