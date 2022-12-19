// LIST COLORS
const Colors = [
	"#17160a","#c3f30c","#14b4ec","#cafa04","#7b9604",
	"#10698b","#1399cb","#1c84ac","#5c7c04"
];

_$.Git = new Octokit({ 
	auth: "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"
});

// MODAL
var optionsModal = {
	footer: true,
    stickyFooter: false,
    closeMethods: ['overlay', 'button', 'escape'],
    closeLabel: "Close",
    cssClass: [],
    onOpen: function() { },
    onClose: function() { },
    beforeClose: function() {
        // here's goes some logic
        // e.g. save content before closing the modal
        return true; // close the modal
       // return false; // nothing happens
    }
}

function getStoreI18n(){
	try{
		return JSON.parse(localStorage.getItem('i18n'))
	}catch{}
	return {}
}

_$.modal = (title, body, button = {}, options = {}) => {
		// instanciate new modal
	var modal = new tingle.modal(_$.extend({}, optionsModal, options));

	modal.setContent(`<h3>${title}</h3>
		${body}`)

	if (_$.isObject(button)) {
		_$.each(button, function(btnO, name) {
			modal.addFooterBtn(name, "tingle-btn tingle-btn--"+btnO.class, btnO.fn)
		})
	}
	return modal
}

// GIT
_$.formatSize = function (bytes, decimals = 2) {
    if (!+bytes) return '0 B'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

_$.formatDate = function (date) {
	var d = new Date(date)

	return `${d.getDate()}/${d.getMonth()}/${d.getFullYear()}`;
}

_$.getLinkLicense = async function(owner, repo) {
	var r = await _$.Git.rest.licenses.getForRepo({
		owner:owner,
		repo: repo
	})
	
	if (r.status == 200) {
		return r.data
	}

	return null
}

_$.getReadme = async (owner, repo) => {
	var r = await _$.Git.rest.repos.getReadme({
		owner:owner,
		repo: repo
	}),
		md = new remarkable.Remarkable({
			html: true,
			xhtmlOut: false,
			breaks: true,
			langPrefix: "language-",
			highlight: function (str, lang) {
			    if (lang && hljs.getLanguage(lang)) {
			      try {
			        return hljs.highlight(str, {language: lang}).value;
			      } catch (err) {}
			    }

			    try {
			      return hljs.highlightAuto(str).value;
			    } catch (err) {}

			    return ''; // use external default escaping
			}
		});

	if (r.status == 200) {
		var c = md.render(atob(r.data.content)),
			rs = ['á', 'ó', "ñ", "í", "Ú", "é"];
		_$.each(["Ã¡", "Ã³", "Ã±", "Ã­","Ãº","Ã©"], function(str, ix){
			c = c.replace(new RegExp(str, "g"), rs[ix])
		})

		let data = {
			link: r.data.html_url,
			content: c,
			encoding: r.data.encoding
		}

		return data
	}

	return null
}

_$.createImage = function(name) {
	var text = _$.camelCase(name),
		canvas = _$('<canvas>'),
		ID = _$.uniqueId('fsimg')
		canvas.attr('id', ID)
		canvas.style({
			display: 'none'
		});

		canvas.appendTo('body');

		var cv = _$("#"+ID).get(0),
			ctx = cv.getContext('2d')
			cv.width=300
  		cv.height=300
	
		ctx.fillStyle = Colors[0]
		ctx.fillRect(0,0,300,300)
		ctx.font = 'bold 30px "Ubuntu Mono",monospace'
		ctx.textAlign = "center"
		ctx.fillStyle = _$.randomMap([Colors[2], Colors[3]])
		ctx.fillText(text, 300/2, 100)
  		var code = cv.toDataURL();
  		_$("#"+ID).remove()
  return code
}

function validRepo(repo) {
	if ([456869845, 558088438, 379059872, 242405809, 348471680].indexOf(repo.id) > -1) {
		return false
	}
	if (['rep98', 'sviluppoweb', 'veb.github.io', 'rep98.github.io', 'tienda', 'loginApp'].indexOf(repo.name) > -1) {
		return false
	}
	if (repo.size < 1) {
		return false
	}
	return true
}

_$.listRepo = async function(per_page= 12, page= 1) {
	var o = {
		sort:'updated',
		/*per_page:per_page || 12,
		page: page || 1 */
	}

	if (_$.empty(_$.Git)) {
		return
	}

	var r = await _$.Git.rest.repos.listForAuthenticatedUser(o)
	if (r.status == 200) {
		var parent = _$("#card-port")
		_$.each(r.data, function(repo){
			if (validRepo(repo)) {
				var item = _$('<div>'),
					place = _$('<div>'),
					img = _$('<img>'),
					caption = _$('<div>'),
					title = _$('<h3>'),
					description = _$('<p>')

				title.html(repo.name)
				title.appendTo(caption)
				description.html(repo.description)
				description.appendTo(caption)
				
				img.attr({
					src: _$.createImage(repo.name),
					loading:'lazy',
					width: 300,
					height: 300,
					alt: repo.name
				})
				img.appendTo(place)
				caption.addClass('img-caption')
				caption.appendTo(place)
				place.addClass('img-place')
				place.appendTo(item)
				item.addClass('grid-item', 'show')
				item.style('cursor', 'pointer')
				item.data('info', repo)
				item.attr('id', 'repo-'+repo.id)
				if (!_$.not(repo.language)) {
					var lang = repo.language.toLowerCase()
					if (_$('[data-filter="'+lang+'"]').length == 0) {
						var btn = _$('<button>')
						btn.addClass('btn','btn-theme-outline')
						btn.attr("data-filter",lang)
						btn.html(lang.toUpperCase())
						btn.appendTo("#filterable")
					}
					item.addClass(lang)
				}
				item.appendTo(parent)

				item.click(function(){
					var js = _$(this).data('info'), homepage = "",
						lang = _$.not(js.language) ? js.language : "",
						ids = {
							licenses: _$.uniqueId('modal-licenses'),
							readme: _$.uniqueId('modal-readme')
						}

					if (_$.empty(lang)) {
						if (!_$.empty(js.languages_url)) {
							lang = '<a href="'+js.languages_url+'" target="_blank" rel="nofollow" alt="Lenguaje">'+js.language+'</a>'
						}
					}

					var m = _$.modal(
						_$.camelCase(js.name),
						`<div class="row">
							<div class="col-md-4">
								<ul class="meta">
									<li class="date">${_$.formatDate(_$.not(js.updated_at) ? js.created_at : js.updated_at)}</li>
									<li class="size">${_$.formatSize(js.size)}</li>
									${ _$.empty(lang) ? '<li class="languages">'+lang+'</li>' : '' }
								</ul>
								<p>${js.description}</p>
								<div id="${ids.licenses}"></div>
							</div>
							<div class="col-md-8" id="${ids.readme}">
								<div class="preload">
									<div class="loading" data-i18n-key="general.loadding">${getStoreI18n().dict.general.loadding}</div>
								</div>
							</div>
						</div>`,{},
						{
							onOpen: function(){
								_$.getLinkLicense(js.owner.login, js.name)
									.then((res) => _$("#"+ids.licenses).html(`<a href="${res.license.url}">${res.license.name}</a>`))
									.catch((err) => console.error(err))
								_$.getReadme(js.owner.login, js.name)
									.then((res) =>  _$("#"+ids.readme).html(res.content))
									.catch((err) => console.error(err))
							}
						})
					if (!_$.empty(js.homepage)) {
						homepage = `<a href="${js.homepage}" class="tingle-btn tingle-btn--primary" target="_blank">${getStoreI18n().dict.repo.homepage}</a>`
					}
					m.setFooterContent(`${homepage} <a href="${js.html_url}" class="tingle-btn tingle-btn--primary" target="_blank"><span class="bi-github"></span> Github</a>`)
					m.open()
					
				})
			}
		})
	}
}

const getLangNav = function() {
    return navigator.languages && navigator.languages.length
    ? navigator.languages[0]
    : navigator.language;
}

var getKey = function(key, value = null, dict) {
    var keys = key.split('.'), text = null;
    _$.each(keys,function(k) {
        dict = text || dict;
        if (_$.isObject(dict)) {
            text = dict[k];
        }
    })
    if (!_$.not(text)) {
        if (text.indexOf('{') > -1 && !_$.not(value)) {
            _$.each(value, (v, n) => {
                text = text.replace('{:'+n+'}', v)
            })
        }
    }
    return text;
}

// I18N
_$.url = (path, query) => {
	if (_$.not(path)) {
		path = '/'
	}
	var l = window.location, 
		base = l.protocol + "//" + (l.host === 'rep98.site' ? 'rep98.site/rep98.github.io/' : 'rep98.github.io/' );

	if (path === '/' && _$.not(query)) {
		return base;
	}

	var url = new URL(path, base);

	if ( !_$.not(query)) {
		_$.each(query, (value, name) => {
			url.searchParam(name, value)
		})		
	}
	return url.toString()
}


_$(function(){

	// Start Animations
	new WOW().init();

	// NAVBAR
	_$(".topbar-nav .toggle-menu").click(function(e){
		_$(".navbar").toggleClass("show")
	})

	_$(".changemode").click(function(e){
		e.preventDefault()
		var newMode = _$(this).attr('href').replace("#","")
		_$('html').attr('data-mode', newMode)
		_$(this).attr('href', newMode == 'dark' ? '#light' : '#dark')
		_$(this).find('span[class*="bi-"]')
			.removeClass("bi-moon","bi-sun")
			.addClass("bi-"+(newMode == "dark" ? 'sun' : 'moon'))
	})

	_$(".dropdown a").click(function(e){
		e.preventDefault()
		_$('.dropdown-menu').toggleClass('show')
	})

	_$(".navbar.show a").click(function(e){
		_$(".navbar").toggleClass("show")
	})


	// YEAR
	_$("#currentYear").html(
		new Date().getFullYear()
	)

	// I18N
	var i18n = function(i18n){
		var dict,
			lang = (i18n || getLangNav()).substring(0, 2),
			codeLang = (i18n || getLangNav()).substring(3).toLowerCase(),
			langAvailabel = _$('html').data('i18n-support');
		return  _$.json(
            _$.url('lang/'+ lang + '.json')
        )
        .then((res) => {
            dict = res;
            localStorage.setItem(
            	'i18n', 
            	JSON.stringify({
            		dict, 
            		i18n, 
            		lang, 
            		codeLang
            	})
            	)

            _$('html').attr('lang', i18n)
            _$('[data-i18n-key]').each(function(el){
            	var key = _$(el).data('i18n-key'),
            		attr = _$(el).data('i18n-attr'),
            		val = _$(el).data('i18n-value')
            		text = getKey(key, JSON.parse(val), dict)

            	if (!_$.empty(attr)) {
            		_$(el).attr(attr, text)
            	}else if (!_$.not(el.value)) {
                    _$(el).emptyVal()
                    _$(el).val(text)
                } else {
                    _$(el).emptyHtml()
                    _$(el).html(text)
                }

            	_$(el).attr({
            		lang: lang
            	})
            })
        })
	}

	i18n(getLangNav())

	_$('.select-lang .dropdown-menu a').click(function(e){
		e.preventDefault()
		NProgress.start();
		var lang = _$(this).attr('lang'),
			parent = _$(this).parents('.select-lang'),
			a = parent.find('.dropdown .lang-seleted')
			
			a.attr('href', lang)

			a.find('.name').html(
				_$(this).find('.name').html()
			)
			a.find('picture img').attr('src', 
				_$(this).find('picture img').attr('src')
			)
			_$('.dropdown-menu .active').removeClass('active')
			_$(this).parent().addClass('active')
		i18n(lang).then(() => NProgress.done())
		_$('.dropdown-menu').toggleClass('show')
		
	})

	// BTN UP
	var backTop = _$(".btn-back_to_top")

	const getSection = function(ID) {
		return [_$("#"+ID).top(),_$("#"+ID).height()]
	}

	_$(window).scroll(function(e){
		var ws = _$(window).scrollTop()
		if ( ws > 400) {
			backTop.style('visibility', 'visible')
		} else if (ws < 400) {
			backTop.style('visibility', 'hidden')
		}
	})

	backTop.click(function(){
		_$("html").get(0).scrollTo({
		  top:0,
		  behavior: 'smooth'
		})
	})

	// LINK SERVICES
	
	// PORTFOLIO
	setTimeout(function(){
		_$.listRepo()
			.then(r => {

			_$("#filterable .btn").click(function(){
				var filterValue = _$(this).attr('data-filter')
				if(filterValue == '*') {
					_$('#card-port .grid-item:not(.show)').addClass('show')
				} else {
					_$('#card-port .grid-item').removeClass('show')
					_$('.grid-item.'+filterValue).addClass('show')
				}
				_$("#filterable .btn").removeClass('selected')
				_$(this).addClass('selected')
			})

			_$("#filterable [disabled]").click(function(e){
				e.preventDefault()
				var m = _$.modal(getStoreI18n().dict.msm.modalTitle,'<p>'+getStoreI18n().dict.msm.modalCont+'</p>')
				m.open()
			})
			NProgress.done();
		})
		const linkWa = 'https://wa.me/584241922546'
		_$('[data-wa-text]').each(function(a){
			var text = _$(a).data('wa-text'),
				u = new URL(linkWa)

				u.searchParams.set("text", encodeURI(`${getStoreI18n().dict.msm.p1} ${text} ${getStoreI18n().dict.msm.p2}`))
			_$(a).attr({
				href: u.href
			})
		})
	
	}, 50)

	_$("#load_portfolio").click(function(e){
		e.preventDefault()
		var i = parseInt(_$(this).data('page')) + 1
		_$.listRepo(6,i)
		_$(this).data('page', i)
	})

	var ob = new IntersectionObserver(function(entries){  
			entries.forEach(entry => {
				if(entry.isIntersecting){
					_$(".nav.menu .active").removeClass('active')
					var a =_$("a[href=\"#"+entry.target.id+"\"]")
					a.addClass('active')
				}    
			})
		}, 
		{
			root: null,
			rootMargin: '0px',
			threshold: 0
		}),
		section = _$('main > section')

	section.each((s) => ob.observe(s))


})