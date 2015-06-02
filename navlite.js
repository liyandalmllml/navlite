;(function ($, Navlite) {
	var Utility = {
		htmlDoc: function (html) {
			var $html = $('<html></html>');
			function process (tag) {
				var result = html.match('<' + tag + '(\\s+[^>]*)?>[\\w\\W]*(?:<\/' + tag + '>)');
				if (result) {
					var obj = {};
					 $.each($('<div' + result[1] + '/>')[0].attributes, function(i, attr) {
	                    obj[attr.name] = attr.value;
	                });
					var $tag= $('<' + tag + '></' + tag + '>').append(result[0]).attr(obj);
					$html.append($tag);
				}
			}
			process('head');
			process('body');
			return $html;
		},
		invokeIfExists: function (func, args, context) {
			if (typeof func === 'function') {
				func.apply(context, args);
			}
		},
		existsNavlite: function () {
			return Boolean(Navlite && Navlite.fetch && Navlite.render);
		},
		search: function (key, url) {
			var searchStr = url || location.search;
			var result = searchStr.match('[\\?&]' + key + '=([^&]+)');
			if (result) {
				return result[1]; 
			}
		},
		addSearchParam: function (url, key, value) {
			var hashUrl = url.split('#')[1] || '';
			var normalUrl = url.split('#')[0];
			var pureUrl = normalUrl.split('?')[0];
			var searchParams = normalUrl.split('?')[1] || '';

			var updated = false;
			searchParams.replace('(?:[\^&]' + key + '=)([^&]+)', function () {
				updated = true;
				return value;
			});
			if (!updated) {
				searchParams += (searchParams ? '?' : '') +  key + '=' + value;
			}
			return pureUrl + (searchParams ? '?' + searchParams : '') + (hashUrl ? '#' + hashUrl : '');
		}
	}; 
	
	if (Utility.existsNavlite()) {
		return;
	}
	
	var _Promise = Promise || function (func) {
		func.call();
	};

	var Page = (function () {
		var searchKey = 'navlitepage';
		var currentPage, oriPage;
		var refresh = function () {
			var pageIndex = parseInt(Utility.search(searchKey), 10) || 1;
			oriPage = currentPage;
			currentPage = pageIndex;
			return currentPage;
		};
		refresh();
		return {
			refresh: refresh,
			setCurrent: function (pageIndex) {
				oriPage = currentPage;
				currentPage = pageIndex;
				return currentPage;
			},

			getCurrent: function () {
				return currentPage;
			},

			getOri: function () {
				return oriPage;
			},

			getSearchKey: function () {
				return searchKey;
 			}
		};
	})();

	var _defaultConfig = {
		urlTransfer: true,
		onBack: function () {
			console.log('back');
		},
		onForward: function () {
			console.log('forward');
		}
	};
	var _config = $.extend(_defaultConfig, {});

	Navlite = {};

	Navlite.config = function () {
		if (argments.length === 1) {
			_config = $.extend(_config, argments[0]);
		} else if (argments.length === 2) {
			var key = argments[0];
			var value = argments[1];
			_config[key] = value;
		}
	};

	Navlite.fetch = function (url, success, error) {
    	return new _Promise(function (resolve, reject) {
			$.ajax({
	    		url: url,
	    		success: function (html) {
	    			var $html = Utility.htmlDoc(html); 
	    			Utility.invokeIfExists(success, [$html]);
		    		Utility.invokeIfExists(resolve, [$html]);
	    		},
		    	error: function (err) {
		    		Utility.invokeIfExists(error, [err]);
		    		Utility.invokeIfExists(reject, [$html]);
		    	}
	    	});
    	});
	};

	Navlite.alterUrl = function (url, options) {
		var pageIndex= Page.getCurrent() + 1;
		url = Utility.addSearchParam(url, Page.getSearchKey(), Page.setCurrent(pageIndex));

		if (_config.urlTransfer) {
			history.pushState({}, 'title', url);
		} else {
			// hash值变换
		}
	};

	Navlite.render = function ($html) {
		var $oriHtml = $('html');
		$oriHtml.find('head').empty().append($html.find('head').children());
		$oriHtml.find('body').empty().append($html.find('body').children());
		function setAttrs (tag) {
			var obj = {};
			var attributes = [];
			if (tag === 'html') {
				attributes = $html[0].attributes;
			} else {
				attributes = $html.find(tag).get(0).attributes;
			}
			$.each(attributes, function (index, attr) {
				obj[attr.name] = attr.value;
			});	
			$oriHtml.attr(obj);
		}
		setAttrs('html');
		setAttrs('head');
		setAttrs('body');
	};
	
	Navlite.available = (function () {
		return Boolean(history.pushState && $);
	})();

	$(window).on('popstate', function () {
		var currentPage = Page.refresh();
		var oriPage = Page.getOri();

		if (currentPage < oriPage) {
			Utility.invokeIfExists(_config.onBack);
		} else if (currentPage > oriPage) {
			Utility.invokeIfExists(_config.onForward);
		}
	});

	window.Navlite = Navlite;

	if (typeof define === 'function' && define.amd) {
		define(function () {
			return Navlite;
		});
	} else if (typeof module === 'object' && module.exports) {
		module.exports = Navlite;
	}
})($, window.Navlite);