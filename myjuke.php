<?php
error_reporting(0);

define('MP3URL', 'https://my-data-server.jp/mp3.php?');
define('NORMAL', 'N');
define('SHUFFLE', 'S');

$json_string = file_get_contents('php://input');
$envelope = json_decode($json_string, true);

// 必須チェック（証明書以外）
if ($envelope['context']['System']['application']['applicationId']
		// スキルIDは修正必須です。このままだとエラーになります。
		// スキルIDをシングルクォートで囲ってください。
		// 例：'amzn1.ask.skill.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
		!= あなたのスキルID) {
	exit;
}
$dif = time() - intval(strtotime($envelope['request']['timestamp']));
if ($dif < -150 || $dif > 150) {
	exit;
}

// 固定ヘッダ
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Cache-Control: post-check=0, pre-check=0', FALSE);
header('Pragma: no-cache');
header('Content-Type: application/json;charset=UTF-8');

// ユーティリティー
class ResponseBuilder {
	private $result = array(
		'version' => '1.0',
		'response' => array(
		)
	);

	static public function newclass() {
		return new ResponseBuilder();
	}

	public function speak($speechText) {
		$this->result['response']['outputSpeech'] = array(
				'type' => 'SSML',
				'ssml' => '<speak>'.$speechText.'</speak>'
			);
		return $this;
	}

	public function reprompt($speechText) {
		$this->result['response']['reprompt']['outputSpeech'] = array(
				'type' => 'SSML',
				'ssml' => '<speak>'.$speechText.'</speak>'
			);
		return $this;
	}

	public function addAudioPlayerPlayDirective($playBehavior, $url, $token, $offset, $expPrevToken) {
		$this->result['response']['directives'] = array(
				array(
					'type' => 'AudioPlayer.Play',
					'playBehavior' => $playBehavior,
					'audioItem' => array(
						'stream' => array(
							'token' => $token,
							'url' => $url,
							'offsetInMilliseconds' => $offset
						)
					)
				)
			);
		if (isset($expPrevToken)) {
			$this->result['response']['directives'][0]['audioItem']['stream']['expectedPreviousToken'] = $expPrevToken;
		}
		return $this;
	}

	public function addAudioPlayerStopDirective() {
		$this->result['response']['directives'] = array(
				array(
					'type' => 'AudioPlayer.Stop'
				)
			);
		return $this;
	}

	public function getResponse() {
		if (empty($this->result['response'])) {
			$this->result['response'] = (object) null;
		}
		echo json_encode($this->result);
	}
}

// parameter関連
class Para {
	public $mode = NORMAL;
	public $num = 0;
	public $cat = 'all';

	public function next() {
		if ($this->mode == SHUFFLE) {
			$this->num = mt_rand(0, 10000 - 1);
		}
		else {
			$this->num++;
		}
	}

	public function previous() {
		if ($this->num > 0) {
			$this->num--;
		}
	}

	public function token() {
		return $this->mode.'-'.strval($this->num).'-'.$this->cat;
	}

	public function url() {
		$uts = time();
		$param = 'cat='.$this->cat.'&num='.strval($this->num).'&state='.strval($uts);
		// パスワード文字列は修正必須です。このままだとエラーになります。
		// データ・サーバのプログラムと同じパスワードをシングルクォートで囲ってください。
		$sum = sha1(あなたのプログラム専用のパスワード文字列をここへ.'cat'.$this->cat.'num'.strval($this->num).'state'.strval($uts));
		$envelope = MP3URL.$param.'&sum='.$sum;
		return $envelope;
	}
}

function getPara($envelope) {
	$para = new Para();
	$token = $envelope['context']['AudioPlayer']['token'];
	if (isset($token) && strpos($token, '-') !== false) {
		$work = explode('-', $token);
		$para->mode = $work[0];
		$para->num = intval($work[1]);
		$para->cat = $work[2];
	}
	return $para;
}

// slot関連
function checkNumber($envelope) {
	$slot_num = $envelope['request']['intent']['slots']['number'];
	if (isset($slot_num) && isset($slot_num['value'])) {
		$num = intval($slot_num['value']);
		return $num;
	}
	return NULL;
}

function checkCategory($envelope) {
	$slot_cat = $envelope['request']['intent']['slots']['category'];
	if (isset($slot_cat) && isset($slot_cat['resolutions']) && isset($slot_cat['resolutions']['resolutionsPerAuthority'])) {
		if ($slot_cat['resolutions']['resolutionsPerAuthority'][0]['status']['code'] == 'ER_SUCCESS_MATCH') {
			if (count($slot_cat['resolutions']['resolutionsPerAuthority'][0]['values']) == 1) {
				return $slot_cat['resolutions']['resolutionsPerAuthority'][0]['values'][0]['value']['id'];
			}
		}
	}
	return NULL;
}

// Intent関連
$type = $envelope['request']['type'];
$intent_name = $envelope['request']['intent']['name'];
if ($type == 'LaunchRequest') {
	$para = new Para();
	$para->mode = SHUFFLE;
	$para->next();
	ResponseBuilder::newclass()
		->addAudioPlayerPlayDirective('REPLACE_ALL', $para->url(), $para->token(), 0, NULL)
		->speak('全部の曲をシャッフル再生します。')
		->getResponse();
}
else if ($type == 'IntentRequest' && $intent_name == 'CountIntent') {
	$para = getPara($envelope);
	$speechText = '現在の曲は'.strval($para->num + 1).'番目です。';
	ResponseBuilder::newclass()
		->speak($speechText)
		->getResponse();
}
else if ($type == 'IntentRequest' && $intent_name == 'DirectIntent') {
	$category = $envelope['request']['intent']['slots']['category']['value'];
	$cat = checkCategory($envelope);
	if (!isset($cat)) {
		$speechText = $category.'を認識できませんでした。';
		ResponseBuilder::newclass()
			->speak($speechText)
			->getResponse();
	}
	$number = $envelope['request']['intent']['slots']['number']['value'];
	$num = checkNumber($envelope);
	if (!isset($num)) {
		$speechText = $number.'を認識できませんでした。';
		ResponseBuilder::newclass()
			->speak($speechText)
			->getResponse();
	}
	$para = getPara($envelope);
	$para->cat = $cat;
	$para->mode = NORMAL;
	$para->num = $num - 1;
	ResponseBuilder::newclass()
		->addAudioPlayerPlayDirective('REPLACE_ALL', $para->url(), $para->token(), 0, NULL)
		->speak($category.'の'.$number.'番目の曲を再生します。')
		->getResponse();
}
else if ($type == 'IntentRequest' && $intent_name == 'CategoryIntent') {
	$category = $envelope['request']['intent']['slots']['category']['value'];
	$cat = checkCategory($envelope);
	if (!isset($cat)) {
		$speechText = $category.'を認識できませんでした。';
		ResponseBuilder::newclass()
			->speak($speechText)
			->getResponse();
	}
	$para = getPara($envelope);
	$para->cat = $cat;
	ResponseBuilder::newclass()
		->addAudioPlayerPlayDirective('REPLACE_ALL', $para->url(), $para->token(), 0, NULL)
		->speak($category.'の曲を再生します。')
		->getResponse();
}
else if ($type == 'IntentRequest' && $intent_name == 'NumberIntent') {
	$number = $envelope['request']['intent']['slots']['number']['value'];
	$num = checkNumber($envelope);
	if (!isset($num)) {
		$speechText = $number.'を認識できませんでした。';
		ResponseBuilder::newclass()
			->speak($speechText)
			->getResponse();
	}
	$para = getPara($envelope);
	$para->mode = NORMAL;
	$para->num = $num - 1;
	ResponseBuilder::newclass()
		->addAudioPlayerPlayDirective('REPLACE_ALL', $para->url(), $para->token(), 0, NULL)
		->speak($number.'番目の曲を再生します。')
		->getResponse();
}
else if ($type == 'IntentRequest' && $intent_name == 'ForwardIntent') {
	$number = $envelope['request']['intent']['slots']['number']['value'];
	$num = checkNumber($envelope);
	if (!isset($num)) {
		$speechText = $number.'を認識できませんでした。';
		ResponseBuilder::newclass()
			->speak($speechText)
			->getResponse();
	}
	$para = getPara($envelope);
	$para->mode = NORMAL;
	$para->num += $num;
	ResponseBuilder::newclass()
		->addAudioPlayerPlayDirective('REPLACE_ALL', $para->url(), $para->token(), 0, NULL)
		//->speak($number.'曲進めて、'.strval($para->num + 1).'番目の曲を再生します。')
		->speak($number.'曲進めます。')
		->getResponse();
}
else if ($type == 'IntentRequest' && $intent_name == 'BackwardIntent') {
	$number = $envelope['request']['intent']['slots']['number']['value'];
	$num = checkNumber($envelope);
	if (!isset($num)) {
		$speechText = $number.'を認識できませんでした。';
		ResponseBuilder::newclass()
			->speak($speechText)
			->getResponse();
	}
	$para = getPara($envelope);
	$para->mode = NORMAL;
	$para->num -= $num;
	if ($para->num < 0) {
		$para->num = 0;
	}
	ResponseBuilder::newclass()
		->addAudioPlayerPlayDirective('REPLACE_ALL', $para->url(), $para->token(), 0, NULL)
		//->speak($number.'曲戻して、'.strval($para->num + 1).'番目の曲を再生します。')
		->speak($number.'曲戻します。')
		->getResponse();
}
else if ($type == 'IntentRequest' && $intent_name == 'AMAZON.PauseIntent') {
	ResponseBuilder::newclass()
		->addAudioPlayerStopDirective()
		->speak('中断します。')
		->getResponse();
}
else if ($type == 'IntentRequest' && $intent_name == 'AMAZON.ResumeIntent') {
	$para = getPara($envelope);
	$offset = $envelope['context']['AudioPlayer']['offsetInMilliseconds'];
	ResponseBuilder::newclass()
		->addAudioPlayerPlayDirective('REPLACE_ALL', $para->url(), $para->token(), $offset, NULL)
		->speak('再開します。')
		->getResponse();
}
else if ($type == 'IntentRequest' && $intent_name == 'AMAZON.NextIntent') {
	$para = getPara($envelope);
	$para->next();
	ResponseBuilder::newclass()
		->addAudioPlayerPlayDirective('REPLACE_ALL', $para->url(), $para->token(), 0, NULL)
		//->speak('次の'.strval($para->num + 1).'番目の曲を再生します。')
		->speak('次の曲を再生します。')
		->getResponse();
}
else if ($type == 'IntentRequest' && $intent_name == 'AMAZON.PreviousIntent') {
	$para = getPara($envelope);
	$para->mode = NORMAL;
	$para->previous();
	ResponseBuilder::newclass()
		->addAudioPlayerPlayDirective('REPLACE_ALL', $para->url(), $para->token(), 0, NULL)
		//->speak('前の'.strval($para->num + 1).'番目の曲を再生します。')
		->speak('前の曲を再生します。')
		->getResponse();
}
else if ($type == 'IntentRequest' && $intent_name == 'AMAZON.ShuffleOnIntent') {
	$para = getPara($envelope);
	$para->mode = SHUFFLE;
	$offset = $envelope['context']['AudioPlayer']['offsetInMilliseconds'];
	ResponseBuilder::newclass()
		->addAudioPlayerPlayDirective('REPLACE_ALL', $para->url(), $para->token(), $offset, NULL)
		->speak('シャッフルをオンにします。')
		->getResponse();
}
else if ($type == 'IntentRequest' && $intent_name == 'AMAZON.ShuffleOffIntent') {
	$para = getPara($envelope);
	$para->mode = NORMAL;
	$offset = $envelope['context']['AudioPlayer']['offsetInMilliseconds'];
	ResponseBuilder::newclass()
		->addAudioPlayerPlayDirective('REPLACE_ALL', $para->url(), $para->token(), $offset, NULL)
		->speak('シャッフルをオフにします。')
		->getResponse();
}
// Playback関連
else if ($type == 'AudioPlayer.PlaybackNearlyFinished') {
	$para = getPara($envelope);
	$para->next();
	$expPrevToken = $envelope['context']['AudioPlayer']['token'];
	ResponseBuilder::newclass()
		->addAudioPlayerPlayDirective('ENQUEUE', $para->url(), $para->token(), 0, $expPrevToken)
		->getResponse();
}
else if ($type == 'AudioPlayer.PlaybackStarted') {
	ResponseBuilder::newclass()
		->getResponse();
}
else if ($type == 'AudioPlayer.PlaybackFinished') {
	ResponseBuilder::newclass()
		->getResponse();
}
else if ($type == 'AudioPlayer.PlaybackStopped') {
	ResponseBuilder::newclass()
		->getResponse();
}
else if ($type == 'AudioPlayer.PlaybackFailed') {
	ResponseBuilder::newclass()
		->getResponse();
}
// その他
else if ($type == 'IntentRequest' && $intent_name == 'AMAZON.HelpIntent') {
	$speechText = 'カテゴリーや番号を指定できます。何を再生しますか？';
	ResponseBuilder::newclass()
		->speak($speechText)
		->reprompt($speechText)
		->getResponse();
}
else if ($type == 'IntentRequest' && ($intent_name == 'AMAZON.CancelIntent' || $intent_name == 'AMAZON.StopIntent')) {
	$speechText = '終了します。';
	ResponseBuilder::newclass()
		->addAudioPlayerStopDirective()
		->speak($speechText)
		->getResponse();
}
else if ($type == 'SessionEndedRequest') {
	$speechText = 'ご利用ありがとうございました。';
	ResponseBuilder::newclass()
		->addAudioPlayerStopDirective()
		->speak($speechText)
		->getResponse();
}
else if ($type == 'IntentRequest') {
	$speechText = '現在その機能は使えません。';
	ResponseBuilder::newclass()
		->speak($speechText)
		->getResponse();
}
else {
	$speechText = 'すみません、もう一度お願いします。';
	ResponseBuilder::newclass()
		->speak($speechText)
		->reprompt($speechText)
		->getResponse();
}
?>
