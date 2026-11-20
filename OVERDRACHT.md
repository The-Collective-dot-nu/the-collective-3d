# Overdracht

Elke versie krijgt hier een blok, nieuwste bovenaan. Hetzelfde blok staat in de pull request. Zo weet de ander (en diens Claude) altijd waar het werk staat.

Let op: deze repo is publiek. Geen klantnamen, prijzen, wachtwoorden of prospectmateriaal.

---

## v1.1 – 20 november 2026 – Kai

**Wat is veranderd**
- Repo verhuisd naar de gedeelde organisatie The-Collective-dot-nu; Kai en Maarten zijn allebei eigenaar.
- Werkafspraken toegevoegd aan CLAUDE.md (sectie "Working together"): eigen branch, pull request, de ander kijkt mee, tag na merge.
- Dit overdrachtsbestand en een pull request-sjabloon toegevoegd.
- Verouderde links naar Maartenleon/the-collective-3d bijgewerkt.

**Waarom**
- Zodat we allebei, ieder met een eigen Claude, op dezelfde versie verder kunnen bouwen zonder elkaars werk te overschrijven.

**Hoe bekijk je het**
- Alleen afspraken en documentatie; aan de website zelf is niets veranderd.

**Wat is nog open**
- Controleren of thecollective.nu na de verhuizing nog goed werkt (Settings > Pages: eigen domein en "Enforce HTTPS").
- Branch protection op main aanzetten (alleen via pull request).
- Na de merge: tag v1.0 op de versie van 28 oktober en v1.1 op deze.
- Bestaande branches `panel-miniatuur`, `tijdlijn-navigator` en `perf`: afmaken of opruimen?

**Volgende stap voor de ander**
- Maarten: lees dit door, zeg akkoord of pas aan, en merge.

---

## v1.0 – 28 oktober 2026 – Maarten (live op thecollective.nu)

Achteraf geschreven op 20 november 2026, op basis van de commits van 24 tot 28 oktober, LEESMIJ.md en CLAUDE.md. Maarten: vul aan of corrigeer waar het niet klopt.

**Wat staat er live**
- De 3D-scrollwebsite: een openluchtconcert in een rode aarden kom. Verhaallijn v3: 11 frames in 4 delen, 9 scrolls (zie `docs/verhaallijn-v3.md`).
- Delen: de opening, "The complexity" (secties lichten een voor een op, met spanning bij het koper), het framework (Plan, Blueprint, Means, Orchestration, Run en Change) met panelen, de vraag aan het publiek, en de problemen naast het framework, plus een About-pagina met Let's talk.
- De tijdlijn linksonder is de enige navigatie, met de knop Next.
- Sinds 26 oktober op het eigen domein thecollective.nu (GitHub Pages vanuit main).

**Wat er in deze versie is veranderd (24-28 oktober)**
- Snelheid: de muzikanten en het publiek worden vooraf gebakken (`site/orchestra.glb`, `site/audience.glb`), schaduwen worden alleen bijgewerkt als er iets verandert, en de site start zodra het orkest er is. Het publiek komt erachteraan.
- Nieuwe openingsshot, een donker laadscherm, en een rustiger landschap met zachte heuvels.
- Probleemkaarten en frameworkonderdelen openen zijpanelen, met tekst uit `bron/site/content.js`.
- Veel telefoonverbeteringen: panelen passen zonder scrollen, de probleemlijst scrolt, en het framework op de telefoon staat lager en gecentreerd.

**Hoe bekijk je het**
- Live: https://thecollective.nu/
- Lokaal: zie LEESMIJ.md ("Snel bekijken"). Bouwen met `python3 bron/build.py`.

**Wat is nog open**
1. Een klantcitaat en één resultaat met een getal in deel 4 (Kai levert aan).
2. Het definitieve e-mailadres (nu soundcheck@thecollective.nu) en waar "Let's talk" heen gaat.
3. De tekst op het programmabord in frame 4.
4. Telefoon: overlappende sectienamen bij Means, en de probleemlijst in frame 10 over het podium.
5. De 8 probleemkaarten bevatten nog conceptteksten; de routes na frame 10 staan in de wacht.
6. Snelheid fase 4 (minder draw calls): volgens de commits al gedaan op 25 oktober, maar in CLAUDE.md staat hij nog als open. Maarten, klopt dat?
7. Branches `panel-miniatuur` en `tijdlijn-navigator` lijken al opgenomen in main, en `perf` is gelijk aan main. Kunnen ze weg?

**Volgende stap voor de ander**
- Kai: de punten 1 tot en met 3 aanleveren of kiezen, daarna verder met de inhoud op een eigen branch.
