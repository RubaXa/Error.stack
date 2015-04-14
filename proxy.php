<?php
	$url = isset($_GET['url']) ? $_GET['url'] : '';


	if(!empty($_SERVER['HTTP_ORIGIN'])) {
		// Enable CORS
		header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
		header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
		header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Range, Content-Disposition, Content-Type');
	}


	if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
		exit();
	}

	if (preg_match('~^https?://\w+~', $url)){
		echo file_get_contents($url);
	}
	else {
		header('HTTP/1.0 400 Bad Request');
	}
