define(['zepto.js'], function($) {	
	(function ($, Navlite) {
		var _defaultConfig = {
				urlTransfer: true,
				onBack: function () {},
				onForward: function () {},
				onError: function () {}
			},
			_config = $.extend(_defaultConfig, {});

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
					searchParams += (searchParams ? '&' : '?') +  key + '=' + value;
				}
				return pureUrl + (searchParams ? '?' + searchParams : '') + (hashUrl ? '#' + hashUrl : '');
			}
		}; 
		
		if (Utility.existsNavlite()) {
			return;
		}

		var _Promise;
		if (typeof Promise === 'function') {
			_Promise = Promise;	
		} else {
			_Promise = function (func) {
				func.call();
			};
		}

		var Page = (function () {
			var searchKey = 'navlitepage';
			var currentPage, oriPage;
			var refresh = function () {
				var pageIndex = parseInt(Utility.search(searchKey,(_config.urlTransfer ? location.href : location.hash)), 10) || 1;
				oriPage = currentPage || 1;
				currentPage = pageIndex || 1;
				return currentPage;
			};
			refresh();
			return {
				refresh: refresh,

				current: function () {
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
		
		var onUrlChange = function () {
			var currentPage = Page.refresh();
			var oriPage = Page.getOri();
			if (Page.alter) {
				Page.alter = false;
				return;
			}

			if (currentPage < oriPage) {
				Utility.invokeIfExists(_config.onBack);
			} else if (currentPage > oriPage) {
				Utility.invokeIfExists(_config.onForward);
			} else {
				Utility.invokeIfExists(_config.onError, [{
					type: 'urlChangeException'
				}]);
			}
		};

		var refreshConfig = function () {
			if (_config.urlTransfer) {
				$(window).off('hashchange', onUrlChange);
				$(window).on('popstate', onUrlChange);
			} else {
				$(window).off('popstate', onUrlChange);
				$(window).on('hashchange', onUrlChange);
			}
		};

		Navlite = {};

		Navlite.config = function () {
			if (arguments.length === 1) {
				_config = $.extend(_config, arguments[0]);
			} else if (arguments.length === 2) {
				var key = arguments[0];
				var value = arguments[1];
				_config[key] = value;
			}
			refreshConfig();
		};

		Navlite.fetch = function (url, success, error) {
	    	return new _Promise(function (resolve, reject) {
				$.ajax({
		    		url: url,
		    		success: function (html) {
		    			var $html = Utility.htmlDoc(html); 
		    			Utility.invokeIfExists(success, [$html, url]);
			    		Utility.invokeIfExists(resolve, [$html, url]);
		    		},
			    	error: function (err) {
			    		Utility.invokeIfExists(error, [err, url]);
			    		Utility.invokeIfExists(reject, [err, url]);
			    	}
		    	});
	    	});
		};

		Navlite.alterUrl = function (url) {
			Page.alter = true;
			url = Utility.addSearchParam(url, Page.getSearchKey(), Page.current() + 1);
			if (_config.urlTransfer) {
				history.pushState({}, 'title', url);
			} else {
				location.hash = url;
				// hash值变换
			}
		};

		Navlite.render = function ($html, oriSelector, selector) {
			selector = selector || oriSelector;
			var $oriHtml = $('html');
			$html = $html.clone();

			function setAttrs (_oriSelector, _selector) {
				_selector = _selector || _oriSelector;
				var obj = {};
				var attributes = [];
				if (_selector === 'html') {
					attributes = $html[0].attributes;
				} else {
					attributes = $html.find(_selector).get(0).attributes;
				}
				$.each(attributes, function (index, attr) {
					obj[attr.name] = attr.value;
				});	
				if (_oriSelector === 'html') {
					$oriHtml.attr(obj);
				} else {
					$oriHtml.find(_oriSelector).attr(obj);
				}
			}

			function updateContent (_oriSelector, _selector) {
				_selector = _selector || _oriSelector;
				if (_oriSelector === 'head') {
					var $head = $html.find('head');
					var $oriHead = $oriHtml.find('head');
					// 替换title标签
					$oriHead.find('title').text($head.find('title').text());
					// 替换link标签
					$oriHead.find('link').remove();
					$oriHead.append($head.find('link'));
				} else {
					$html.find('script').not('[navlite-load], [type="template"]').remove();
					$oriHtml.find(_oriSelector).html($html.find(_selector).html());
				}
			}
			if (oriSelector) {
				updateContent(oriSelector, selector);
				setAttrs(oriSelector, selector);
			} else {
				setAttrs('html');
				updateContent('head');
				setAttrs('head');
				updateContent('body');
				setAttrs('body');	
			}
			
		};
		
		Navlite.available = (function () {
			return Boolean(history.pushState && $);
		})();
		
		refreshConfig();

		window.Navlite = Navlite;
	})($, window.Navlite);
	return window.Navlite;
});
