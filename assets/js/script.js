function showDialog(dialogId) {
	const dialog = document.querySelector(dialogId);
	if (dialog) {
		dialog.showModal(); // Muestra el diálogo como modal
		document.body.style.overflow = 'hidden'; // Evita el scroll del fondo
	}
}
function closeDialog(dialog) {
	dialog.classList.add("closing");
	dialog.addEventListener(
		"transitionend",
		() => {
			dialog.classList.remove("closing");
			dialog.close();
		},
		{ once: true }
	);
	document.body.style.overflow = ''; // Restaura el scroll del fondo
}

const getNodeDialogId = (nodeText) => {
	switch (nodeText.toUpperCase()) {
		case 'SOBRE MÍ':
		case 'BASE DE CONOCIMIENTO':
		case 'ÁREA DE DESARROLLO':
			return 'about-me-dialog';
		case 'SERVICIOS': 
		case 'DISEÑO & DESARROLLO WEB': 
		case 'DESARROLLO BACKEND & APIS': 
		case 'AUTOMATIZACIÓN & SCRIPTING': 
		case 'DESARROLLO DE SOFTWARE A MEDIDA': 
		case 'OPTIMIZACIÓN Y MANTENIMIENTO WEB': 
		case 'LOCALIZACIÓN WEB': 
		case 'CONSULTORÍA TECNOLÓGICA': 
			return 'services-dialog';
		case 'PORTAFOLIOS': return 'portfolio-dialog';
		case 'CONTACTOS': 
		case 'FORMULARIO DE CONTACTO': 
		case 'ENLACES DE REDES SOCIALES': 
			return 'contact-dialog';
		case 'CRÉDITOS': return 'credits-dialog';
		// case 'BASES LEGALES': return 'legal-bases-dialog';
		// Puedes añadir casos para sub-nodos si quieres que abran algo específico,
		// aunque para sub-nodos en un flujo, lo normal es que no abran un diálogo principal.
		// Si quieres que abran los sub-diálogos directamente, considera que el flujo
		// del diagrama de Mermaid los muestra como parte de un grupo, no como enlaces primarios.
		// Para los sub-diálogos, usaremos los botones dentro del diálogo "Bases Legales".
		default: return null;
	}
};

function init() {
	// Setting Anchor
	const MermaidContainer = document.querySelector("#mermaid-diagram-container")
	const MermaidSvg = MermaidContainer.querySelector("svg")
	const MermaidNodes = MermaidContainer.querySelectorAll('.node')

	MermaidNodes.forEach(v => {
		const nodeText = v.querySelector('.nodeLabel').innerText.trim();
		const dialogId = getNodeDialogId(nodeText);
		if (dialogId) {
			v.addEventListener('click', () => showDialog(`#${dialogId}`))
		} else {
			const dataID = v.getAttribute('data-id')
			if(dataID == "A") {
				v.addEventListener('click', () => location.reload())
			} else if(dataID.indexOf("H") > -1 && dataID.length > 1) {
				let page = dataID == "H1" ? "/manifest.html" : 
						dataID == "H2" ? "/privacy-policy.html" 
						: "/terms"
				
				v.addEventListener('click', () => location.assign(page))
			}
		}
	})

	panzoom(MermaidSvg, {
		autocenter: true,
		bounds: true,
		initialX: 100,
		initialY: 100,
		initialZoom: 0.5
	});
	document.querySelectorAll("#menu a").forEach(A => {
		A.addEventListener("click", (e) => {
			e.preventDefault()
			e.stopPropagation()
			const href = A.href
			to_href(href)
		})
	})
	const GlobalHREF = location.href
	if (GlobalHREF.indexOf("#") > -1) {
		to_href(GlobalHREF)
	}
	setTimeout(() => document.querySelector("#custom-loader").classList.remove("show"), 500)
}

function to_href(href) {
	if (href.indexOf('#') > -1) {
		const href2 = href.split("#")
		const dialogID = `#${href2[1]}`;
		showDialog(dialogID)
	} else {
		const URL_DEV = "https://rep98.server.test"
		const URL_PROP = "https://rep98.github.io"
		const hurl = new URL(href)
		if (hurl.origin === URL_PROP) {
			location.assign(href)
		} else if(hurl.origin == URL_DEV){
			hurl.pathname = `/rep98.github.io${hurl.pathname}`
			location.assign(hurl.href)
		}
	}
}

document.addEventListener("DOMContentLoaded", () => {
	mermaid.initialize({ 
		startOnLoad: false, 
		theme: 'dark',
		darkMode: true, 
		// look: "handDrawn",
		fontFamily: '"Inconsolata", monospace',
		flowchart:
		{
			curve: "monotoneX"
		}
	}); 

	mermaid.run({
		querySelector: '.mermaid',
		postRenderCallback: function() {
			init()
		}
	});
	
	const AsingLogo = document.querySelectorAll(".dialog-logo")
	const logoTemplate = document.getElementById('logo-template');
	AsingLogo.forEach(target => {
		const clone = logoTemplate.content.cloneNode(true);
		target.appendChild(clone);
	});

	document.querySelectorAll('.dialog-close-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const dialog = e.target.closest('.custom-dialog');
            if (dialog) {
                closeDialog(dialog);
            }
        });
    });
})
