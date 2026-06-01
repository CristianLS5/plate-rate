<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/CristianLS5/plate-rate">
    <img src="public/dark_brand_icon.png" alt="Plate Rate logo" width="80" height="80">
  </a>

  <h3 align="center">Plate Rate</h3>

  <p align="center">
    Angular + Firebase app to manage personal restaurant ratings and compare them with community opinions.
    <br />
    <a href="https://github.com/CristianLS5/plate-rate.png"><strong>Explore the repo »</strong></a>
    <br />
    <br />
    <a href="https://github.com/CristianLS5/plate-rate/issues">Report Bug</a>
    ·
    <a href="https://github.com/CristianLS5/plate-rate/issues/new?labels=bug&template=bug-report---.md">Bug report template</a>
    ·
    <a href="https://github.com/CristianLS5/plate-rate/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#firebase--environment">Firebase &amp; environment</a></li>
        <li><a href="#run-functions-locally-optional">Run Functions locally (optional)</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#firestore-resources">Firestore resources</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

[![Plate Rate][product-screenshot]](https://github.com/CristianLS5/plate-rate)

**Plate Rate** helps you build a personal list of restaurants you have visited, rate them on your own scale, and see how your scores compare with other users who saved the same place.

Why this project:

* Keep a single source of truth for your restaurant ratings instead of scattered notes or spreadsheets.
* Search places quickly with geocoding-backed suggestions and coordinates for maps.
* See community averages and text-only opinions on a shared detail page without exposing names unless someone has rated.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

* [![Angular][Angular.io]][Angular-url]
* [![Firebase][Firebase.com]][Firebase-url]
* [![Tailwind CSS][Tailwindcss.com]][Tailwind-url]
* [![TypeScript][TypeScript.dev]][TypeScript-url]

Additional services and libraries:

* **Cloud Firestore** — user lists, opinions, and aggregated stats
* **Firebase Auth** — Google Sign-In
* **Firebase Functions** (optional) — Photon search proxy and rating aggregation
* **[Photon](https://photon.komoot.io/)** — OpenStreetMap geocoding for restaurant search
* **Angular Material** — UI components

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

Follow these steps to run the frontend locally.

### Prerequisites

* [Node.js](https://nodejs.org/) (LTS recommended) and **npm**
* A [Firebase](https://firebase.google.com/) project with **Authentication** (Google provider) and **Cloud Firestore** enabled

### Installation

1. Clone the repository
   ```sh
   git clone https://github.com/CristianLS5/plate-rate.git
   cd plate-rate
   ```
2. Install dependencies
   ```sh
   npm install
   ```
3. Configure Firebase (see next section)
4. Start the dev server
   ```sh
   npm start
   ```
   The app is served at `http://localhost:4200/` by default.

### Firebase & environment

1. Create or copy `src/environments/environment.ts` and `src/environments/environment.development.ts` with your Firebase web app config:
   ```ts
   export const environment = {
     production: false,
     firebase: {
       apiKey: 'YOUR_API_KEY',
       authDomain: 'YOUR_PROJECT.firebaseapp.com',
       projectId: 'YOUR_PROJECT_ID',
       storageBucket: 'YOUR_PROJECT.appspot.com',
       messagingSenderId: 'YOUR_SENDER_ID',
       appId: 'YOUR_APP_ID',
     },
     /** Optional Firebase Functions base URL to proxy Photon search. Leave empty to call Photon from the browser. */
     apiBaseUrl: '',
   };
   ```
2. Keep private credentials and service account keys **out of git**.
3. Deploy Firestore rules and indexes from this repo before using production data:
   ```sh
   firebase deploy --only firestore:rules,firestore:indexes
   ```

Restaurant search uses [Photon](https://photon.komoot.io/) from the browser and does not require an API key. Set `apiBaseUrl` only if you want search requests to go through your Firebase Function proxy.

### Run Functions locally (optional)

Restaurant search works without Cloud Functions. Use the `functions` package only if you need the `searchRestaurants` proxy or automatic `aggregateRestaurantStats` on list changes:

```sh
cd functions
npm install
npm run build
firebase emulators:start --only functions,firestore
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->
## Usage

After signing in with Google, you land on your **personal list**:

| Area | What you can do |
|------|-----------------|
| **Search & add** | Find restaurants via Photon; duplicate detection warns if a place is already on your list |
| **Card view** | Map preview from coordinates; open Google Maps on click; your rate badge on each card |
| **Table view** | Sort by name, country, rate, or date added; filter by name or country |
| **Public detail** | `/public/:restaurantId` — place info, map, your list rating, community average, and text-only comments |

Routes (lazy-loaded):

* `/login` — Google Sign-In
* `/personal` — your list (protected)
* `/public/:restaurantId` — community view for a saved restaurant (protected)

Community display rules:

* Numeric ratings contribute to the community average (synced via Cloud Functions when configured).
* Comments are text-only and do not affect averages.
* User names appear on public views only when that user has a rating; display names are stored on save (`userName` from Google).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Firestore resources

* Security rules: [`firestore.rules`](firestore.rules)
* Composite indexes: [`firestore.indexes.json`](firestore.indexes.json)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

- [x] Google Sign-In with Firebase Auth
- [x] Personal restaurant list (card and table views)
- [x] Photon-backed search with duplicate detection
- [x] Filters and table sorting
- [x] Public detail with community average and opinions
- [x] Optional Cloud Functions for search proxy and stats aggregation
- [ ] Hosted demo / CI deploy pipeline
- [ ] Export or backup of personal list

See the [open issues](https://github.com/CristianLS5/plate-rate/issues) for proposed features and known bugs.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

Contributions are welcome. If you have an idea that would make Plate Rate better, fork the repo and open a pull request, or open an issue with the `enhancement` label.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/MyFeature`)
3. Commit your changes (`git commit -m 'Add MyFeature'`)
4. Push to the branch (`git push origin feature/MyFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

Distributed under the MIT License. See [`LICENSE.txt`](LICENSE.txt) for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

Cristian López Solá — [LinkedIn][linkedin-url]

Project link: [https://github.com/CristianLS5/plate-rate](https://github.com/CristianLS5/plate-rate)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [Angular](https://angular.dev/) and [Firebase](https://firebase.google.com/) documentation
* [Photon](https://photon.komoot.io/) and [OpenStreetMap](https://www.openstreetmap.org/) for geocoding data
* [Komoot](https://www.komoot.com/) for operating the Photon API
* [shields.io](https://shields.io) for README badges
* [Best-README-Template](https://github.com/othneildrew/Best-README-Template) for the README structure

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/CristianLS5/plate-rate.svg?style=for-the-badge
[contributors-url]: https://github.com/CristianLS5/plate-rate/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/CristianLS5/plate-rate.svg?style=for-the-badge
[forks-url]: https://github.com/CristianLS5/plate-rate/network/members
[stars-shield]: https://img.shields.io/github/stars/CristianLS5/plate-rate.svg?style=for-the-badge
[stars-url]: https://github.com/CristianLS5/plate-rate/stargazers
[issues-shield]: https://img.shields.io/github/issues/CristianLS5/plate-rate.svg?style=for-the-badge
[issues-url]: https://github.com/CristianLS5/plate-rate/issues
[license-shield]: https://img.shields.io/github/license/CristianLS5/plate-rate.svg?style=for-the-badge
[license-url]: https://github.com/CristianLS5/plate-rate/blob/main/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://www.linkedin.com/in/cristian-l%C3%B3pez-sol%C3%A1-2b6493204/?locale=en_US
[product-screenshot]: public/plate_rate.png
[Angular.io]: https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white
[Angular-url]: https://angular.dev/
[Firebase.com]: https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white
[Firebase-url]: https://firebase.google.com/
[Tailwindcss.com]: https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
[TypeScript.dev]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
