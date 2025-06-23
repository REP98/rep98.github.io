// Constantes
const GITHUB_TOKEN = null;
const REPOS_PER_PAGE = 9; 
const CACHE_EXPIRATION_HOURS = 24;

const Storage = {
    get(key, _default = null) {
        const stringData = localStorage.getItem(key)
        if (!stringData) return _default
        try {
            const data = JSON.parse(stringData)
            return data;
        } catch (error) {
            return stringData;
        }
    },
    set(key, value) {
        try {
            const valueToStore = (Array.isArray(value) || (typeof value === 'object' && value !== null)) 
                                ? JSON.stringify(value) 
                                : value;
            localStorage.setItem(key, valueToStore)
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                alert('El almacenamiento local está lleno. No se pudieron guardar todos los datos.');
            }
            return null
        }
    }
}
 
const CacheData = {
    get(key) {
        const stringData = localStorage.getItem(key)
        if (!stringData) return null;
        try{
            const data = JSON.parse(stringData)
            const now = new Date().getTime();
            if (now > data.expiry) {
                localStorage.removeItem(key);
                console.log(`Caché para ${key} ha expirado.`);
                return null;
            }
            return data.value;
        } catch (e) {
            console.log(`Caché para ${key} ha dado un error: ${e}`);
            localStorage.removeItem(key);
            return null;
        }
    },
    set(key, value, hours = 24) {
        const now = new Date().getTime()
        const expiry = now + hours * 60 * 60 * 1000;
        const data = {value, expiry}
        try {
            const dataString = JSON.stringify(data);
            const dataSizeKB = new TextEncoder().encode(dataString).length / 1024;
            
            const localStorageLimitKB = 5 * 1024;
            if (dataSizeKB > localStorageLimitKB * 0.8) {
                console.warn(`Advertencia: Los datos de caché son grandes (${dataSizeKB.toFixed(2)} KB) y podrían exceder el límite de localStorage.`);
            }
            localStorage.setItem(key, dataString)
        } catch (e) {
            console.error('Error al guardar en localStorage:', e);
            if (e.name === 'QuotaExceededError') {
                alert('El almacenamiento local está lleno. Es posible que los datos no se guarden para futuras visitas.');
            }
        }
    }
}

class Repos {
    _all_nature_repositories = []
    _all_repositories = []
    _filtered_repositories = []
    _filter_languages = [] 
    _filter_tags = [] 

    constructor() {
        this._get_repos()
    }
    static async start() {
        const instancia = new Repos();
        await instancia._get_repos();
        return instancia;
    }
    async _get_repos() {
        const cacheKey = 'filtered_repos_cache';
        const cacheKeyNatural = 'natural_repos_cache';
        let cachedData = CacheData.get(cacheKey)
        let cacheDataNatural = CacheData.get(cacheKeyNatural)
        if (cachedData && cacheDataNatural) {
            this._all_repositories = cachedData
            this._all_nature_repositories = cacheDataNatural
            this._populate_filters()
        } else {
            const header = GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {}
            try {
                const userReposResponse = await fetch("https://api.github.com/users/REP98/repos?per_page=100&sort=pushed&direction=desc", {headers: header})
                if (!userReposResponse.ok) {
                    if (userReposResponse.status === 403 && userReposResponse.headers.get('X-RateLimit-Remaining') === '0') {
                        throw new Error('GitHub API rate limit exceeded. Por favor, inténtalo de nuevo más tarde o usa un token autenticado para límites más altos.');
                    }
                    throw new Error(`Error al obtener repositorios: ${userReposResponse.statusText}`);
                }
                const repos = await userReposResponse.json();
                
                const enrichmentPromises = repos.map(async (repo) => {
                    let allLanguages = {}
                    try {
                        const langResponse = await fetch(repo.languages_url, {headers: header})
                        if (langResponse.ok) {
                            allLanguages = await langResponse.json()
                        }
                    } catch (e) {
                        console.warn(`No se pudieron obtener lenguajes para ${repo.name}:`, error);
                    }
                    repo.all_languages = allLanguages

                    let releases = []
                    try {
                        const cleanReleasesUrl = repo.releases_url.replace('{/id}', '');
                        const allRelease = await fetch(cleanReleasesUrl, {headers: header})
                        if (allRelease.ok) {
                            releases = await allRelease.json()
                        }
                    } catch (error) {
                        console.warn(`No se pudo verificar releases para ${repo.name}:`, error);
                    }
                    repo.releases = releases
                    return repo
                })

                this._all_nature_repositories = await Promise.all(enrichmentPromises)
                
                this._apply_filter()
                this._populate_filters()
                CacheData.set(cacheKey, this._all_repositories, CACHE_EXPIRATION_HOURS)
                CacheData.set(cacheKeyNatural, this._all_nature_repositories, CACHE_EXPIRATION_HOURS)
            } catch (error) {
                console.error('Error fetching repositories:', error);
            }
        }
    }

    _apply_filter() {
        const exclude_repo =["rep98.github.io", "REP98"]
        this._all_repositories = []
        for(const repo of this._all_nature_repositories) {
            if (!exclude_repo.includes(repo.name) && repo.size > 0) {
                this._all_repositories.push({
                    id: repo.id,
                    name: repo.name,
                    private: repo.private,
                    html_url: repo.html_url,
                    description: repo.description,
                    fork: repo.fork,
                    created_at: repo.created_at, 
                    updated_at: repo.updated_at,
                    pushed_at: repo.pushed_at,
                    git_url: repo.git_url,
                    clone_url: repo.clone_url,
                    homepage: repo.homepage,
                    size: repo.size,
                    stargazers_count: repo.stargazers_count,
                    languages: repo.all_languages,
                    language: repo.language,
                    has_wiki: repo.has_wiki,
                    has_pages: repo.has_pages,
                    archived: repo.archived,
                    disabled: repo.disabled,
                    license: repo.license,
                    visibility: repo.visibility,
                    default_branch: repo.default_branch,
                    topics: repo.topics,
                    releases: repo.releases
                })
            }
        }
    }

    _populate_filters() {
        const uniqueLanguages = new Set();
        const uniqueTags = new Set();

        this._all_repositories.forEach(repo => {
            if (repo.languages) {
                Object.keys(repo.languages).forEach(lang => {
                    if (lang) uniqueLanguages.add(lang); 
                });
            } else if (repo.language) { 
                uniqueLanguages.add(repo.language);
            }

            if (repo.topics && Array.isArray(repo.topics)) {
                repo.topics.forEach(tag => {
                    if (tag) uniqueTags.add(tag); 
                });
            }
        });

        this._filter_languages = Array.from(uniqueLanguages).sort();
        this._filter_tags = Array.from(uniqueTags).sort();
        
        // document.dispatchEvent(new CustomEvent('reposLoaded', { detail: { languages: this._filter_languages, tags: this._filter_tags } }));
    }

    get languages() {
        return this._filter_languages;
    }

    get tags() {
        return [...this._filter_tags];
    }

    get repositories() {
        return [...this._all_repositories]
    }

    get leaked_repositories(){
        return [...this._filtered_repositories]
    }

    get nature_repositories() {
        return [...this._all_nature_repositories]
    }

    filter_lang(lang) {
        let results = this._filtered_repositories.length > 0 ? [...this._filtered_repositories] : [...this._all_repositories];
        if (lang) {
            results = results.filter(repo => {
                // Verificar si el lenguaje está en el objeto de lenguajes del repo
                return (repo.languages && Object.keys(repo.languages).includes(lang)) || 
                    (repo.language && repo.language.includes(lang));
            });
        }
        this._filtered_repositories = results;
        return [...this._filtered_repositories];
    }

    filter_tag(tag) {
        let results = this._filtered_repositories.length > 0 ? [...this._filtered_repositories] : [...this._all_repositories];
        if (tag) {
            results = results.filter(repo => {
                // Verificar si la etiqueta está en el array de topics del repo
                return repo.topics && Array.isArray(repo.topics) && repo.topics.includes(tag);
            });
        }
        this._filtered_repositories = results;
        return [...this._filtered_repositories];
    }

    only_pages() {
        let results = this._filtered_repositories.length > 0 ? [...this._filtered_repositories] : [...this._all_repositories];
        this._filtered_repositories = results.filter(repo => repo.has_pages === true);
        return [...this._filtered_repositories]; 
    }

    sort(order, ascending = false) {
        let sortedRepos = this._filtered_repositories.length > 0 ? [...this._filtered_repositories] : [...this._all_repositories];
        sortedRepos.sort((a, b) => {
            switch (order) {
                case 'stars':
                    // Ordenar por estrellas (descendente por defecto)
                    return ascending ? a.stargazers_count - b.stargazers_count : b.stargazers_count - a.stargazers_count;
                case 'updated':
                    // Ordenar por fecha de última actualización (más recientes primero por defecto)
                    const dateA = new Date(a.updated_at);
                    const dateB = new Date(b.updated_at);
                    return ascending ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
                case 'created':
                    // Ordenar por fecha de última actualización (más recientes primero por defecto)
                    const cdateA = new Date(a.created_at);
                    const cdateB = new Date(b.created_at);
                    return ascending ? cdateA.getTime() - cdateB.getTime() : cdateB.getTime() - cdateA.getTime();
                case 'name':
                    // Ordenar por nombre alfabéticamente
                    return ascending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
                case "size":
                    // Ordena por tamaños
                    return ascending ? a.size - b.size : b.size - a.size;
                default:
                    // Si no se especifica un orden válido, mantener el orden actual o por defecto (ej. por 'pushed_at' que es el que viene de la API)
                    return 0; 
            }
        });
        this._filtered_repositories = sortedRepos;
        return [...this._filtered_repositories];
    }
    search(term) {
        let repositories = this._filtered_repositories.length > 0 ? [...this._filtered_repositories] : [...this._all_repositories];
        repositories = repositories.filter(repo => 
            repo.name.toLowerCase().includes(term) ||
            (repo.description && repo.description.toLowerCase().includes(term)) ||
            (repo.language && repo.language.toLowerCase().includes(term)) ||
            (repo.languages && Object.keys(repo.languages).some(lang => lang.toLowerCase().includes(term))) ||
            (repo.topics && repo.topics.some(topic => topic.toLowerCase().includes(term))) 
        )
        this._filtered_repositories = repositories
        return repositories
    }
    reset_filters() {
        this._filtered_repositories = [...this._all_repositories];
        return [...this._filtered_repositories];
    }
}

function add_option(context, options) {
    options.forEach(text => {
        const option = document.createElement("option");
        option.value = text;
        option.textContent = text;
        context.appendChild(option);
    });
}

let AllRepositoriesShow = {
    Active: [],
    Legacy: []
}


const Projects = {
    isLoadingMore: {
        active: false,
        legacy: false
    },
    currentPage: {
        active: 0,
        legacy: 0
    },
    element: {
        containers:{
            legacy: document.querySelector("#legacyProjectsContainer"),
            active: document.querySelector("#activeProjectsContainer")
        },
        loadingIndicators: {
            active: document.getElementById('loadingIndicatorActive'),
            legacy: document.getElementById('loadingIndicatorLegacy')
        },
        loadMoreBtns: {
            active: document.getElementById('loadMoreBtnActive'),
            legacy: document.getElementById('loadMoreBtnLegacy')
        }
    },
    createCard(repo){
        const Tpl = document.querySelector("#projectCardTemplate");

        const card = Tpl.content.cloneNode(true);
        if (repo.archived) {
            card.querySelector("article").classList.add('legacy-card')
        }
        card.querySelector('[data-project-title]').textContent = repo.name.replace(/-/g, ' '); // Reemplazar guiones por espacios
        card.querySelector('[data-project-description]').textContent = repo.description || 'Sin descripción disponible.';
        card.querySelector('[data-github-link]').href = repo.html_url;

        const pageLink = card.querySelector('[data-page-link]');
        if (repo.has_pages) { 
            pageLink.href = `https://rep98.github.io/${repo.name}`;
            pageLink.style.display = 'inline-block'; // Mostrar el botón
        } else {
            pageLink.style.display = 'none'; // Asegurar que esté oculto
        }

        // Metadatos
        if (Object.keys(repo.languages) == 0 && !repo.language) {
            card.querySelector('[data-project-language]').style.display = 'none';
        } else {
            card.querySelector('[data-project-language]').style.display = 'inline';
        }
        if (Object.keys(repo.languages).length > 0) {
            card.querySelector('[data-project-language] > span').textContent = Object.keys(repo.languages).join(" | ");
        } else {
            card.querySelector('[data-project-language] > span').textContent = repo.language ? repo.language : '';
        }
        
        card.querySelector('[data-project-updated] > span').textContent = new Date(repo.updated_at).toLocaleDateString();
        card.querySelector('[data-project-stars] > span').textContent = repo.stargazers_count;
        if (repo.archived) {
            card.querySelector('[data-project-archive]').style.display = 'block';
        } else {
            card.querySelector('[data-project-archive]').style.display = 'none';
        }
        // Tags/Topics
        const tagsContainer = card.querySelector('[data-project-tags]');
        if (repo.topics && repo.topics.length > 0) {
            repo.topics.forEach(topic => {
                const tagSpan = document.createElement('span');
                tagSpan.classList.add('project-tag');
                tagSpan.textContent = topic;
                tagsContainer.appendChild(tagSpan);
            });
        } else {
            tagsContainer.style.display = 'none'; // Ocultar si no hay tags
        }

        return card;
        
    },
    render(projects, isLegacy = false){
        const container = isLegacy ? 
            Projects.element.containers.legacy : 
            Projects.element.containers.active;

        if ((!isLegacy && this.currentPage.active === 0) || 
            (isLegacy && this.currentPage.legacy === 0)) {
            container.innerHTML = '';
        }

        const fragment = document.createDocumentFragment();
        projects.forEach(repo => {
            const card =Projects.createCard(repo)
            fragment.appendChild(card)
        })
        container.appendChild(fragment)
    },
    loadMore(isLegacy = false) {
        const type = isLegacy ? 'legacy' : 'active';
        if (this.isLoadingMore[type]) return;
        
        this.isLoadingMore[type] = true;
        const loadingIndicator = this.element.loadingIndicators[type];
        loadingIndicator.classList.add("show");

        const currentPage = this.currentPage[type];
        const startIndex = currentPage * REPOS_PER_PAGE;
        const endIndex = startIndex + REPOS_PER_PAGE;
        const projectsToRender = isLegacy ? 
            AllRepositoriesShow.Legacy.slice(startIndex, endIndex) :
            AllRepositoriesShow.Active.slice(startIndex, endIndex);

        if (projectsToRender.length > 0) {
            setTimeout(() => {
                this.render(projectsToRender, isLegacy)
                this.currentPage[type]++
                this.isLoadingMore[type] = false;
                const totalProjects = isLegacy ? 
                    AllRepositoriesShow.Legacy.length : 
                    AllRepositoriesShow.Active.length;
                const loadMoreBtn = this.element.loadMoreBtns[type];
                if (endIndex < totalProjects) {
                    loadMoreBtn.classList.add('show')
                } else {
                    loadMoreBtn.classList.remove('show')
                }
                loadingIndicator.classList.remove('show')
            }, 500)
        } else {
            loadingIndicator.querySelector('p').textContent = 'No hay más proyectos.';
            loadingIndicator.querySelector('.spinner').style.display = 'none';
            this.isLoadingMore[type] = false;
            this.element.loadMoreBtns[type].classList.remove("show")
        }
    },
    resetPagination() {
        this.currentPage.active = 0;
        this.currentPage.legacy = 0;
        this.element.containers.active.innerHTML = '';
        this.element.containers.legacy.innerHTML = '';
        
        // Ocultar todos los indicadores y botones inicialmente
        this.element.loadingIndicators.active.classList.remove("show");
        this.element.loadingIndicators.legacy.classList.remove("show");
        this.element.loadMoreBtns.active.classList.remove("show");
        this.element.loadMoreBtns.legacy.classList.remove("show");
        
        // Mostrar botones solo si hay más proyectos que REPOS_PER_PAGE
        if (AllRepositoriesShow.Active.length > REPOS_PER_PAGE) {
            this.element.loadMoreBtns.active.classList.add('show');
        }
        if (AllRepositoriesShow.Legacy.length > REPOS_PER_PAGE) {
            this.element.loadMoreBtns.legacy.classList.add('show');
        }
    }
}

async function applyFiltersAndSort() {
    const repo = await Repos.start()
    const searchInput = document.getElementById('searchInput');
    const languageFilter = document.getElementById('languageFilter');
    const tagFilter = document.getElementById('tagFilter');
    const hasPageFilter = document.getElementById('hasPageFilter');
    const sortOrder = document.getElementById('sortOrder');
    const typeOrder = document.querySelector("#typeOrder");
    const searchValue = searchInput.value.toLowerCase();

    repo.reset_filters();

    if(searchValue) {
        repo.search(searchValue)
    }
    const selectedLanguage = languageFilter.value;
    if (selectedLanguage) {
        repo.filter_lang(selectedLanguage)
    }
    const selectedTag = tagFilter.value;
    if (selectedTag) {
        repo.filter_tag(selectedTag)
    }

    if (hasPageFilter.checked) {
        repo.only_pages()
    }

    const currentSortOrder = sortOrder.value;
    if (currentSortOrder) {
        repo.sort(currentSortOrder, typeOrder.checked)
    }

    const leaked_repositories = repo.leaked_repositories;
    AllRepositoriesShow.Active = leaked_repositories.filter(r => !r.archived)
    AllRepositoriesShow.Legacy = leaked_repositories.filter(r => r.archived)
    
    Projects.resetPagination()
    Projects.loadMore(false); // Active
    Projects.loadMore(true);  // Legacy
}

document.addEventListener("DOMContentLoaded", async () => {
    console.log("INICIANDO PORTAFOLIO")
    // Gestion del Menú
    const menu = document.querySelector("#menu")
    const toggleMenu = document.querySelector(".btn-menu")
    toggleMenu.addEventListener("click", () => {
        toggleMenu.classList.toggle('toggler-open');
        menu.classList.toggle('open');
    })
    // Elementos del Filtrado del Portafolio
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.querySelector(".search-container .search-icon")
    const languageFilter = document.getElementById('languageFilter');
    const tagFilter = document.getElementById('tagFilter');
    const hasPageFilter = document.getElementById('hasPageFilter');
    const sortOrder = document.getElementById('sortOrder');
    const typeOrder = document.querySelector("#typeOrder");
    const resetFiltersBtn = document.getElementById('resetFilters');
    // Carga inicial del los repositorios
    const repos = await Repos.start()
    const currentRepo = repos.leaked_repositories.length > 0 ? [...repos.leaked_repositories] : [...repos.repositories]
    AllRepositoriesShow.Active = currentRepo.filter(r => !r.archived)
    AllRepositoriesShow.Legacy = currentRepo.filter(r => r.archived)
    //console.log(repos.repositories, repos.nature_repositories)
    
    Projects.loadMore(false)
    Projects.loadMore(true)
    // Adición de los lenguajes y etiquetas disponibles para su filtrado
    if (repos.languages.length > 0) {
        add_option(languageFilter, repos.languages)
    }
    if (repos.tags.length > 0) {
        add_option(tagFilter, repos.tags)
    }
    // Activación de eventos
    searchInput.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") {
            e.preventDefault()
            await applyFiltersAndSort()
        }
    })

    searchBtn.addEventListener("click", applyFiltersAndSort)
    languageFilter.addEventListener("change", applyFiltersAndSort)
    tagFilter.addEventListener("change", applyFiltersAndSort)
    hasPageFilter.addEventListener("change", applyFiltersAndSort)
    sortOrder.addEventListener("change", applyFiltersAndSort)
    typeOrder.addEventListener("change", applyFiltersAndSort)
    resetFiltersBtn.addEventListener("click", () => {
        searchInput.value = '';
        languageFilter.value = '';
        tagFilter.value = '';
        hasPageFilter.value = '';
        sortOrder.value = 'updated_at_desc';
        repos.reset_filters()
        AllRepositoriesShow.Active = repos.repositories.filter(r => !r.archived)
        AllRepositoriesShow.Legacy = repos.repositories.filter(r => r.archived)
        Projects.resetPagination()
        Projects.loadMore(false)
        Projects.loadMore(true)
    })

    document.getElementById('loadMoreBtnActive').addEventListener('click', () => {
        Projects.loadMore(false);
    });
    
    document.getElementById('loadMoreBtnLegacy').addEventListener('click', () => {
        Projects.loadMore(true);
    });
})

function collapseFilter(){
    document.querySelector(".portfolio-controls").classList.toggle('open')
}

function handlerMovil(m){
    if (m.matches) {
        document.querySelector(".toggle-filter").addEventListener("click", collapseFilter)
    } else {
        document.querySelector(".toggle-filter").removeEventListener("click", collapseFilter)
    }
}

window.addEventListener("load", () => {
    const Movil = window.matchMedia('(max-width: 768px)');
    handlerMovil(Movil)
    Movil.addEventListener('change', handlerMovil)
    setTimeout(() => document.querySelector("#custom-loader").classList.remove("show"),500)
})
