# Eval results — 2026-07-27T10:10:37.900Z

**Model:** `qwen/qwen3-embedding-8b`
**Top-k:** 10
**Scope:** `everystudent-fr` (cases whose relevant set includes it; whole-corpus retrieval)
**Cases:** 18

## Metrics

_recall + coverage lead; P@1/MRR secondary — see docs/eval-approach.md._

| Metric | Value |
|--------|-------|
| recall@3 | 1.000 |
| recall@10 | 1.000 |
| coverage | 0.848 |
| MRR | 1.000 |
| precision@1 | 1.000 |

## Per-source coverage

(cases where the source has a relevant doc — recall = any of its docs returned; coverage = mean fraction returned)

| source | cases | recall | coverage |
|--------|------:|-------:|---------:|
| `everystudent-fr` | 18 | 1.000 | 0.856 |
| `thelife-fr` | 14 | 1.000 | 0.826 |

## Per-language coverage

(grouped by each case's resolved retrieval language. A multi-language source
like `cru` blends its languages in the per-source view above — this splits them.
`(unscoped)` means no language was derivable: the case searched the whole
multilingual corpus, which is a case-configuration bug, not a result.)

| language | cases | recall@10 | coverage |
|----------|------:|----------:|---------:|
| `fr` | 18 | 1.000 | 0.848 |

## Per-case

| | id | question | first rank | coverage | top hit |
|---|----|----------|-----------|----------|---------|
| ✓ | `tlfr-seeker-deuil-fils` | Mon fils est mort il y a quelques mois et je suis en colère contre Dieu — est-ce que ma foi peut survivre à ça ? | 1 | 5/9 | `/comment-garder-la-foi-apres-la-perte-de-mon-fils` (0.767) |
| ✓ | `tlfr-skeptic-dieu-existe` | Je suis athée : donnez-moi une seule bonne raison de penser qu'un dieu existe. | 1 | 9/20 | `/a/athee.html` (0.752) |
| ✓ | `tlfr-skeptic-resurrection` | Comment peut-on croire sérieusement qu'un homme mort est revenu à la vie il y a 2000 ans ? | 1 | 6/8 | `/jesus-est-il-ressuscite-a-la-vie-eternelle` (0.726) |
| ✓ | `tlfr-seeker-porno` | Je n'arrive pas à décrocher du porno et j'ai tellement honte — comment m'en sortir ? | 1 | 6/6 | `/a/511toxique.html` (0.766) |
| ✓ | `tlfr-newcomer-jesus` | Je ne connais presque rien à Jésus — c'était qui, et qu'est-ce qu'il a fait de si important ? | 1 | 5/8 | `/a/201foiaveugle.html` (0.678) |
| ✓ | `tlfr-seeker-anxiete` | Mon cerveau n'arrête jamais de ressasser mes inquiétudes — comment retrouver une vraie paix intérieure ? | 1 | 8/8 | `/a/coronavirus.html` (0.668) |
| ✓ | `esfr-newcomer-religions` | Toutes les religions ne mènent-elles pas au même Dieu, au fond ? | 1 | 4/5 | `/a/205divin.html` (0.670) |
| ✓ | `esfr-seeker-sens-vie` | Je me lève chaque matin sans savoir à quoi je sers — est-ce que ma vie a un sens ? | 1 | 3/4 | `/a/305but.html` (0.673) |
| ✓ | `esfr-seeker-peur-mort` | J'ai peur de mourir et je ne sais pas ce qu'il y a après — est-ce que quelqu'un peut me le dire ? | 1 | 4/4 | `/a/608apres.html` (0.744) |
| ✓ | `esfr-skeptic-enfer` | Un châtiment infini pour une vie finie, comment est-ce que ça peut être juste ? | 1 | 2/3 | `/10-questions-spirituelles-avec-reponses` (0.615) |
| ✓ | `esfr-newcomer-trinite` | On me dit qu'il y a un seul Dieu mais aussi le Père, le Fils et l'Esprit — comment ça marche ? | 1 | 2/2 | `/a/709trinite.html` (0.747) |
| ✓ | `esfr-seeker-apparence` | Je déteste mon reflet et je me compare sans arrêt aux autres — est-ce que je vaux quelque chose ? | 1 | 5/5 | `/a/509beaute.html` (0.618) |
| ✓ | `esfr-seeker-lgbt` | Je suis lesbienne et l'église m'a rejetée — est-ce que Dieu peut encore m'aimer ? | 1 | 2/2 | `/a/homosexuel-lesbienne.html` (0.769) |
| ✓ | `esfr-believer-priere-sans-reponse` | Je prie depuis des mois pour la même chose et rien ne bouge — est-ce que Dieu écoute ? | 1 | 2/3 | `/a/306lapriere.html` (0.754) |
| ✓ | `esfr-skeptic-islam-jesus` | Les musulmans disent que Jésus était un prophète, pas le Fils de Dieu — qui a raison ? | 1 | 5/5 | `/voir-dieu-face-a-face` (0.706) |
| ✓ | `esfr-newcomer-catholique` | Ma famille est catholique mais des amis me disent que je ne suis pas vraiment chrétien — qui a raison ? | 1 | 1/1 | `/a/723catholique.html` (0.766) |
| ✓ | `esfr-skeptic-racisme` | La religion a servi à justifier l'esclavage et à maintenir les femmes en bas — pourquoi lui faire confiance ? | 1 | 2/2 | `/a/MLK-et-le-racisme.html` (0.633) |
| ✓ | `esfr-seeker-mariage` | Avec tous les divorces autour de moi, est-ce que ça vaut encore le coup de se marier ? | 1 | 3/3 | `/a/502mariage.html` (0.747) |
