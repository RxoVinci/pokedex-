// Adresse utilisée pour demander les 151 premiers Pokémon à la PokéAPI.
const ADRESSE_API = "https://pokeapi.co/api/v2/pokemon?limit=151";

// Traduction des types anglais fournis par l'API.
const TRADUCTIONS_TYPES = {
    normal: "normal",
    fire: "feu",
    water: "eau",
    grass: "plante",
    electric: "electrik",
    ice: "glace",
    fighting: "combat",
    poison: "poison",
    ground: "sol",
    flying: "vol",
    psychic: "psy",
    bug: "insecte",
    rock: "roche",
    ghost: "spectre",
    dragon: "dragon",
    dark: "tenebres",
    steel: "acier",
    fairy: "fee"
};

// Traduction des statistiques.
const TRADUCTIONS_STATISTIQUES = {
    hp: "PV",
    attack: "Attaque",
    defense: "Défense",
    "special-attack": "Attaque spé.",
    "special-defense": "Défense spé.",
    speed: "Vitesse"
};


*/
class Pokemon {
    constructor(donnees, nomFrancais) {
        this.id = donnees.id;
        this.nom = nomFrancais;
        this.nomAnglais = donnees.name;

        this.image =
            donnees.sprites.other["official-artwork"].front_default ||
            donnees.sprites.front_default;

        this.taille = donnees.height / 10;
        this.poids = donnees.weight / 10;

        this.types = donnees.types.map(function (element) {
            return TRADUCTIONS_TYPES[element.type.name];
        });

        this.statistiques = donnees.stats.map(function (element) {
            return {
                nom: TRADUCTIONS_STATISTIQUES[element.stat.name],
                valeur: element.base_stat
            };
        });
    }
}


*/
class Pokedex {
    constructor() {
        this.pokemons = [];
        this.favoris = this.chargerFavoris();

        this.champRecherche = document.querySelector("#recherche");
        this.filtreType = document.querySelector("#filtre-type");
        this.listePokemon = document.querySelector("#liste-pokemon");
        this.messageResultat = document.querySelector("#message-resultat");
        this.nombreFavoris = document.querySelector("#nombre-favoris");

        this.fenetreDetails = document.querySelector("#fenetre-details");
        this.informationsPokemon = document.querySelector(
            "#informations-pokemon"
        );
        this.boutonFermer = document.querySelector("#fermer-details");

        this.preparerEvenements();
        this.mettreAJourCompteur();
    }



    async demarrer() {
        try {
            this.listePokemon.innerHTML =
                "<p class='message-vide'>Chargement des Pokémon...</p>";

            const reponse = await fetch(ADRESSE_API);

            if (!reponse.ok) {
                throw new Error("La PokéAPI ne répond pas correctement.");
            }

            const donneesListe = await reponse.json();

            await this.chargerTousLesPokemons(donneesListe.results);

            this.creerOptionsTypes();
            this.afficherPokemons(this.pokemons);
        } catch (erreur) {
            console.error(erreur);

            this.listePokemon.innerHTML = `
        <p class="message-erreur">
          Impossible de charger les Pokémon.
          Vérifie ta connexion Internet, puis actualise la page.
        </p>
      `;
        }
    }



    async chargerTousLesPokemons(liste) {
        const tailleGroupe = 20;

        for (let debut = 0; debut < liste.length; debut += tailleGroupe) {
            const groupe = liste.slice(debut, debut + tailleGroupe);

            const promesses = groupe.map(async function (pokemonListe) {
                const numero = pokemonListe.url
                    .split("/")
                    .filter(Boolean)
                    .pop();

                const adresseEspece =
                    `https://pokeapi.co/api/v2/pokemon-species/${numero}`;

                const reponses = await Promise.all([
                    fetch(pokemonListe.url),
                    fetch(adresseEspece)
                ]);

                if (!reponses[0].ok || !reponses[1].ok) {
                    throw new Error("Erreur pendant le chargement d'un Pokémon.");
                }

                const donnees = await Promise.all([
                    reponses[0].json(),
                    reponses[1].json()
                ]);

                const nomFrancaisTrouve = donnees[1].names.find(
                    function (traduction) {
                        return traduction.language.name === "fr";
                    }
                );

                const nomFrancais = nomFrancaisTrouve
                    ? nomFrancaisTrouve.name
                    : donnees[0].name;

                return new Pokemon(donnees[0], nomFrancais);
            });

            const pokemonsDuGroupe = await Promise.all(promesses);

            this.pokemons.push(...pokemonsDuGroupe);

            this.listePokemon.innerHTML = `
        <p class="message-vide">
          Chargement : ${this.pokemons.length} Pokémon sur 151...
        </p>
      `;
        }

        this.pokemons.sort(function (premier, second) {
            return premier.id - second.id;
        });
    }



    afficherPokemons(listeAAfficher) {
        this.listePokemon.innerHTML = "";

        if (listeAAfficher.length === 0) {
            this.listePokemon.innerHTML = `
        <p class="message-vide">
          Aucun Pokémon ne correspond à ta recherche.
        </p>
      `;

            this.messageResultat.textContent = "0 résultat";
            return;
        }

        listeAAfficher.forEach((pokemon) => {
            const carte = document.createElement("article");

            carte.classList.add("carte-pokemon");

            const estFavori = this.favoris.includes(pokemon.id);

            carte.innerHTML = `
        <button
          class="bouton-favori"
          type="button"
          aria-label="Ajouter ou retirer ${pokemon.nom} des favoris"
        >
          ${estFavori ? "❤️" : "🤍"}
        </button>

        <p class="numero-pokemon">
          #${String(pokemon.id).padStart(3, "0")}
        </p>

        <img
          class="image-pokemon"
          src="${pokemon.image}"
          alt="${pokemon.nom}"
          loading="lazy"
        >

        <h2 class="nom-pokemon">${pokemon.nom}</h2>

        <div class="liste-types">
          ${this.creerBadgesTypes(pokemon.types)}
        </div>
      `;

            const boutonFavori = carte.querySelector(".bouton-favori");

            boutonFavori.addEventListener("click", (evenement) => {
                evenement.stopPropagation();
                this.basculerFavori(pokemon.id);
            });

            carte.addEventListener("click", () => {
                this.afficherDetails(pokemon);
            });

            this.listePokemon.appendChild(carte);
        });

        this.messageResultat.textContent =
            `${listeAAfficher.length} Pokémon affiché(s)`;
    }


    creerBadgesTypes(types) {
        return types
            .map(function (type) {
                return `
          <span class="type-pokemon type-${type}">
            ${type}
          </span>
        `;
            })
            .join("");
    }


    creerOptionsTypes() {
        const tousLesTypes = this.pokemons.flatMap(function (pokemon) {
            return pokemon.types;
        });

        const typesSansDoublons = [...new Set(tousLesTypes)];

        typesSansDoublons.sort(function (premier, second) {
            return premier.localeCompare(second, "fr");
        });

        typesSansDoublons.forEach((type) => {
            const option = document.createElement("option");

            option.value = type;
            option.textContent = type;

            this.filtreType.appendChild(option);
        });
    }
    filtrerPokemons() {
        const recherche = this.normaliserTexte(
            this.champRecherche.value
        );

        const typeSelectionne = this.filtreType.value;

        const resultats = this.pokemons.filter((pokemon) => {
            const nomFrancais = this.normaliserTexte(pokemon.nom);
            const nomAnglais = this.normaliserTexte(pokemon.nomAnglais);

            const correspondAuNom =
                nomFrancais.includes(recherche) ||
                nomAnglais.includes(recherche);

            const correspondAuType =
                typeSelectionne === "tous" ||
                pokemon.types.includes(typeSelectionne);

            return correspondAuNom && correspondAuType;
        });

        this.afficherPokemons(resultats);
    }


    normaliserTexte(texte) {
        return texte
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    basculerFavori(idPokemon) {
        const position = this.favoris.indexOf(idPokemon);

        if (position === -1) {
            this.favoris.push(idPokemon);
        } else {
            this.favoris.splice(position, 1);
        }

        this.sauvegarderFavoris();
        this.mettreAJourCompteur();
        this.filtrerPokemons();
    }



    sauvegarderFavoris() {
        localStorage.setItem(
            "favorisPokedex",
            JSON.stringify(this.favoris)
        );
    }



    chargerFavoris() {
        const favorisEnregistres = localStorage.getItem(
            "favorisPokedex"
        );

        if (favorisEnregistres === null) {
            return [];
        }

        try {
            return JSON.parse(favorisEnregistres);
        } catch (erreur) {
            console.error("Les favoris enregistrés sont invalides.", erreur);
            return [];
        }
    }



    mettreAJourCompteur() {
        this.nombreFavoris.textContent = this.favoris.length;
    }



    afficherDetails(pokemon) {
        const statistiquesHTML = pokemon.statistiques
            .map(function (statistique) {
                const largeur = Math.min(statistique.valeur, 150) / 1.5;

                return `
          <div class="statistique">
            <span class="nom-statistique">
              ${statistique.nom}
            </span>

            <div class="barre-statistique">
              <div
                class="valeur-statistique"
                style="width: ${largeur}%"
              ></div>
            </div>

            <strong>${statistique.valeur}</strong>
          </div>
        `;
            })
            .join("");

        this.informationsPokemon.innerHTML = `
      <div class="entete-details">
        <img src="${pokemon.image}" alt="${pokemon.nom}">

        <div>
          <p class="numero-pokemon">
            #${String(pokemon.id).padStart(3, "0")}
          </p>

          <h2>${pokemon.nom}</h2>

          <div class="liste-types">
            ${this.creerBadgesTypes(pokemon.types)}
          </div>

          <div class="mesures-pokemon">
            <span class="mesure">
              <strong>Taille :</strong> ${pokemon.taille} m
            </span>

            <span class="mesure">
              <strong>Poids :</strong> ${pokemon.poids} kg
            </span>
          </div>
        </div>
      </div>

      <h3>Statistiques</h3>

      <div>
        ${statistiquesHTML}
      </div>
    `;

        this.fenetreDetails.classList.remove("cachee");
        document.body.style.overflow = "hidden";
    }



    fermerDetails() {
        this.fenetreDetails.classList.add("cachee");
        document.body.style.overflow = "";
    }


    preparerEvenements() {
        this.champRecherche.addEventListener("input", () => {
            this.filtrerPokemons();
        });

        this.filtreType.addEventListener("change", () => {
            this.filtrerPokemons();
        });

        this.boutonFermer.addEventListener("click", () => {
            this.fermerDetails();
        });

        this.fenetreDetails.addEventListener("click", (evenement) => {
            if (evenement.target === this.fenetreDetails) {
                this.fermerDetails();
            }
        });

        document.addEventListener("keydown", (evenement) => {
            if (evenement.key === "Escape") {
                this.fermerDetails();
            }
        });
    }
}


const application = new Pokedex();
application.demarrer();