/**
 * Simple bug
 */


(function ($){
	$(window).on('bug', Error.wrap(function (){
		bug("fail");
	}));

	$(window).trigger('bug');
})(jQuery);
