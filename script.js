// Adresse de l'API qui contient les 151 premiers Pokemon.
const ADRESSE_API = "https://pokeapi.co/api/v2/pokemon?limit=151";

// L'API utilise des noms anglais. Cet objet permet de les afficher en francais.
const traductionsTypes = {
    normal: "normal", fire: "feu", water: "eau", grass: "plante",
    electric: "electrik", ice: "glace", fighting: "combat", poison: "poison",
    ground: "sol", flying: "vol", psychic: "psy", bug: "insecte",
    rock: "roche", ghost: "spectre", dragon: "dragon", dark: "tenebres",
    steel: "acier", fairy: "fee"
};

// Traduction des noms des statistiques recues depuis l'API.
const traductionsStatistiques = {
    hp: "PV", attack: "Attaque", defense: "Defense",
    "special-attack": "Attaque spe.", "special-defense": "Defense spe.",
    speed: "Vitesse"
};

// Tableau qui contiendra tous les Pokemon charges depuis l'API.
let pokemons = [];

// Les numeros des Pokemon favoris sont conserves dans le navigateur.
let favoris = chargerFavoris();

// Recuperation des elements HTML que JavaScript doit modifier.
const champRecherche = document.querySelector("#recherche");
const filtreType = document.querySelector("#filtre-type");
const listePokemon = document.querySelector("#liste-pokemon");
const messageResultat = document.querySelector("#message-resultat");
const nombreFavoris = document.querySelector("#nombre-favoris");
const fenetreDetails = document.querySelector("#fenetre-details");
const informationsPokemon = document.querySelector("#informations-pokemon");
const boutonFermer = document.querySelector("#fermer-details");

async function demarrer() {
    // Cette fonction lance le chargement de la liste des Pokemon.
    try {
        afficherMessage("Chargement des Pokemon...");

        const reponse = await fetch(ADRESSE_API);
        if (!reponse.ok) {
            throw new Error("La PokeAPI ne repond pas correctement.");
        }

        const donnees = await reponse.json();

        // On charge les Pokemon un par un pour garder un code simple a comprendre.
        for (let i = 0; i < donnees.results.length; i++) {
            const pokemon = await chargerPokemon(donnees.results[i]);
            pokemons.push(pokemon);
        }

        pokemons.sort(function (premier, second) {
            return premier.id - second.id;
        });

        ajouterTypesDansMenu();
        afficherPokemons(pokemons);
    } catch (erreur) {
        console.error(erreur);
        listePokemon.innerHTML = "<p class='message-erreur'>Impossible de charger les Pokemon. Verifie ta connexion Internet.</p>";
    }
}

async function chargerPokemon(pokemonDeLaListe) {
    // On recupere les informations generales du Pokemon.
    const reponsePokemon = await fetch(pokemonDeLaListe.url);
    const donneesPokemon = await reponsePokemon.json();

    // Une deuxieme requete permet de recuperer le nom francais.
    const reponseEspece = await fetch(
        `https://pokeapi.co/api/v2/pokemon-species/${donneesPokemon.id}`
    );
    const donneesEspece = await reponseEspece.json();
    const nomFrancais = donneesEspece.names.find(function (nom) {
        return nom.language.name === "fr";
    });

    // On garde uniquement les informations utiles pour notre application.
    return {
        id: donneesPokemon.id,
        nom: nomFrancais ? nomFrancais.name : donneesPokemon.name,
        nomAnglais: donneesPokemon.name,
        image: donneesPokemon.sprites.other["official-artwork"].front_default || donneesPokemon.sprites.front_default,
        taille: donneesPokemon.height / 10,
        poids: donneesPokemon.weight / 10,
        types: donneesPokemon.types.map(function (type) {
            return traductionsTypes[type.type.name];
        }),
        statistiques: donneesPokemon.stats.map(function (statistique) {
            return {
                nom: traductionsStatistiques[statistique.stat.name],
                valeur: statistique.base_stat
            };
        })
    };
}

function afficherMessage(message) {
    // Affiche un message dans la zone normalement reservee aux cartes.
    listePokemon.innerHTML = `<p class="message-vide">${message}</p>`;
}

function afficherPokemons(liste) {
    // Efface l'ancien affichage avant de creer les nouvelles cartes.
    listePokemon.innerHTML = "";

    if (liste.length === 0) {
        afficherMessage("Aucun Pokemon ne correspond a ta recherche.");
        messageResultat.textContent = "0 resultat";
        return;
    }

    // Creation d'une carte HTML pour chaque Pokemon de la liste.
    liste.forEach(function (pokemon) {
        const carte = document.createElement("article");
        carte.className = "carte-pokemon";
        const coeur = favoris.includes(pokemon.id) ? "❤️" : "🤍";

        carte.innerHTML = `
            <button class="bouton-favori" type="button" aria-label="Ajouter ou retirer ${pokemon.nom} des favoris">${coeur}</button>
            <p class="numero-pokemon">#${String(pokemon.id).padStart(3, "0")}</p>
            <img class="image-pokemon" src="${pokemon.image}" alt="${pokemon.nom}" loading="lazy">
            <h2 class="nom-pokemon">${pokemon.nom}</h2>
            <div class="liste-types">${creerBadgesTypes(pokemon.types)}</div>
        `;

        // Le bouton favori ne doit pas ouvrir la fenetre de details.
        carte.querySelector(".bouton-favori").addEventListener("click", function (evenement) {
            evenement.stopPropagation();
            changerFavori(pokemon.id);
        });
        carte.addEventListener("click", function () {
            afficherDetails(pokemon);
        });
        listePokemon.appendChild(carte);
    });

    messageResultat.textContent = `${liste.length} Pokemon affiche(s)`;
}

function creerBadgesTypes(types) {
    // Transforme chaque type en badge colore grace aux classes CSS.
    return types.map(function (type) {
        return `<span class="type-pokemon type-${type}">${type}</span>`;
    }).join("");
}

function ajouterTypesDansMenu() {
    // Construit la liste des types disponibles dans le menu deroulant.
    const types = [];

    pokemons.forEach(function (pokemon) {
        pokemon.types.forEach(function (type) {
            if (!types.includes(type)) {
                types.push(type);
            }
        });
    });

    types.sort();
    types.forEach(function (type) {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        filtreType.appendChild(option);
    });
}

function filtrerPokemons() {
    // La recherche fonctionne avec le nom francais et le nom anglais.
    const recherche = normaliserTexte(champRecherche.value);
    const typeChoisi = filtreType.value;
    const resultats = pokemons.filter(function (pokemon) {
        const nomCorrespond = normaliserTexte(pokemon.nom).includes(recherche) ||
            normaliserTexte(pokemon.nomAnglais).includes(recherche);
        const typeCorrespond = typeChoisi === "tous" || pokemon.types.includes(typeChoisi);
        return nomCorrespond && typeCorrespond;
    });

    afficherPokemons(resultats);
}

function normaliserTexte(texte) {
    // Retire les accents pour que "é" et "e" soient recherches de la meme facon.
    return texte.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function changerFavori(idPokemon) {
    // Ajoute ou retire le Pokemon de la liste des favoris.
    if (favoris.includes(idPokemon)) {
        favoris = favoris.filter(function (id) {
            return id !== idPokemon;
        });
    } else {
        favoris.push(idPokemon);
    }

    localStorage.setItem("favorisPokedex", JSON.stringify(favoris));
    mettreAJourCompteur();
    filtrerPokemons();
}

function chargerFavoris() {
    // Recupere les favoris sauvegardes lors d'une ancienne visite.
    const favorisEnregistres = localStorage.getItem("favorisPokedex");
    if (!favorisEnregistres) {
        return [];
    }

    try {
        return JSON.parse(favorisEnregistres);
    } catch (erreur) {
        console.error("Les favoris enregistres sont invalides.", erreur);
        return [];
    }
}

function mettreAJourCompteur() {
    // Met a jour le nombre affiche en haut de la page.
    nombreFavoris.textContent = favoris.length;
}

function afficherDetails(pokemon) {
    // Prepare les barres de statistiques de la fenetre de details.
    const statistiques = pokemon.statistiques.map(function (statistique) {
        const largeur = Math.min(statistique.valeur, 150) / 1.5;
        return `
            <div class="statistique">
                <span class="nom-statistique">${statistique.nom}</span>
                <div class="barre-statistique"><div class="valeur-statistique" style="width: ${largeur}%"></div></div>
                <strong>${statistique.valeur}</strong>
            </div>
        `;
    }).join("");

    // Insert toutes les informations du Pokemon dans la fenetre.
    informationsPokemon.innerHTML = `
        <div class="entete-details">
            <img src="${pokemon.image}" alt="${pokemon.nom}">
            <div>
                <p class="numero-pokemon">#${String(pokemon.id).padStart(3, "0")}</p>
                <h2>${pokemon.nom}</h2>
                <div class="liste-types">${creerBadgesTypes(pokemon.types)}</div>
                <div class="mesures-pokemon">
                    <span class="mesure"><strong>Taille :</strong> ${pokemon.taille} m</span>
                    <span class="mesure"><strong>Poids :</strong> ${pokemon.poids} kg</span>
                </div>
            </div>
        </div>
        <h3>Statistiques</h3>
        <div>${statistiques}</div>
    `;

    fenetreDetails.classList.remove("cachee");
    document.body.style.overflow = "hidden";
}

function fermerDetails() {
    // Cache la fenetre et permet a nouveau de faire defiler la page.
    fenetreDetails.classList.add("cachee");
    document.body.style.overflow = "";
}

// Evenements des champs de recherche et de la fenetre de details.
champRecherche.addEventListener("input", filtrerPokemons);
filtreType.addEventListener("change", filtrerPokemons);
boutonFermer.addEventListener("click", fermerDetails);
fenetreDetails.addEventListener("click", function (evenement) {
    if (evenement.target === fenetreDetails) {
        fermerDetails();
    }
});
document.addEventListener("keydown", function (evenement) {
    if (evenement.key === "Escape") {
        fermerDetails();
    }
});

// Initialisation de l'application.
mettreAJourCompteur();
demarrer();
