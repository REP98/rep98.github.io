function showDialog(dialogId) {
	const dialog = document.getElementById(dialogId);
	if (dialog) {
		dialog.showModal(); // Muestra el diálogo como modal
		document.body.style.overflow = 'hidden'; // Evita el scroll del fondo
	}
}
function closeDialog(dialog) {
	dialog.close();
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
			v.addEventListener('click', () => showDialog(dialogId))
		} else {
			const dataID = v.getAttribute('data-id')
			if(dataID == "A") {
				v.addEventListener('click', () => location.reload())
			} else if(dataID.indexOf("H") > -1 && dataID.length > 1) {
				let page = dataID == "H1" ? "/manifest.html" : 
						dataID == "H2" ? "/PrivacyPolicies.html" 
						: "/Terms"
				
				v.addEventListener('click', () => location.assign(page))
			}
		}
	})
	document.querySelectorAll('#legal-bases-dialog .open-sub-dialog').forEach(button => {
		button.addEventListener('click', (e) => {
			const targetDialogId = e.target.dataset.dialogTarget;
			if (targetDialogId) {
				showDialog(targetDialogId);
			}
		});
	});

        // Event listeners para los botones del footer
	document.querySelectorAll('.open-dialog-footer-btn').forEach(button => {
		button.addEventListener('click', (e) => {
			const targetDialogId = e.target.dataset.dialogTarget;
			if (targetDialogId) {
				showDialog(targetDialogId);
			}
		});
	});

	panzoom(MermaidSvg);
}

document.addEventListener("DOMContentLoaded", () => {
	console.log("INICIADO")
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
			console.log('Diagrama renderizado!');
			init()
		}
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
