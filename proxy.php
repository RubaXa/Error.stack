<?php
	$url = isset($_GET['url']) ? $_GET['url'] : '';

	if (preg_match('~^https?://\w+~', $url)){
		echo file_get_contents($url);
	}
	else {
		header('HTTP/1.0 400 Bad Request');
	}
