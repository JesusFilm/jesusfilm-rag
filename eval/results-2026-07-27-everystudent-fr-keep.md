# Eval results — 2026-07-27T09:33:17.701Z

**Model:** `qwen/qwen3-embedding-8b`
**Top-k:** 10
**Scope:** whole-corpus
**Cases:** 130

## Metrics

_recall + coverage lead; P@1/MRR secondary — see docs/eval-approach.md._

| Metric | Value |
|--------|-------|
| recall@3 | 0.954 |
| recall@10 | 1.000 |
| coverage | 0.736 |
| MRR | 0.854 |
| precision@1 | 0.746 |

## Per-source coverage

(cases where the source has a relevant doc — recall = any of its docs returned; coverage = mean fraction returned)

| source | cases | recall | coverage |
|--------|------:|-------:|---------:|
| `cru` | 36 | 0.861 | 0.636 |
| `everystudent` | 22 | 0.773 | 0.693 |
| `everystudent-ar` | 12 | 1.000 | 0.979 |
| `everystudent-fr` | 18 | 1.000 | 0.856 |
| `familylife` | 23 | 0.913 | 0.745 |
| `jesusfilm-org` | 30 | 0.667 | 0.537 |
| `sightline-ministry` | 46 | 0.783 | 0.563 |
| `starting-with-god` | 24 | 0.458 | 0.375 |
| `thelife` | 41 | 0.878 | 0.634 |
| `thelife-fr` | 18 | 1.000 | 0.778 |
| `thelife-zh` | 10 | 1.000 | 0.867 |

## Per-language coverage

(grouped by each case's resolved retrieval language. A multi-language source
like `cru` blends its languages in the per-source view above — this splits them.
`(unscoped)` means no language was derivable: the case searched the whole
multilingual corpus, which is a case-configuration bug, not a result.)

| language | cases | recall@10 | coverage |
|----------|------:|----------:|---------:|
| `ar` | 12 | 1.000 | 0.979 |
| `en` | 78 | 1.000 | 0.641 |
| `es` | 8 | 1.000 | 0.938 |
| `fr` | 22 | 1.000 | 0.804 |
| `zh` | 10 | 1.000 | 0.867 |

## Per-case

| | id | question | first rank | coverage | top hit |
|---|----|----------|-----------|----------|---------|
| ✓ | `swg-seeker-anxiety` | My mind races with anxiety constantly and I can't switch it off — is there a way to actually find peace? | 2 | 9/19 | `/faq/peace.html` (0.741) |
| ✓ | `swg-seeker-failure` | I keep messing up and feel like God must be so disappointed in me. Is there any hope? | 1 | 5/22 | `/hope-not-wishful-thinking-for-christians` (0.714) |
| ✓ | `swg-seeker-porn` | I can't stop looking at porn and I hate myself for it — is there any way out? | 1 | 1/3 | `/struggles/how-to-get-free-from-porn.html` (0.717) |
| ✓ | `swg-skeptic-faith-proof` | Isn't faith just believing something with no proof? Sounds like wishful thinking. | 2 | 3/6 | `/devotionals/if-only-i-could-see` (0.658) |
| ✓ | `swg-skeptic-jesus-deity` | Did Jesus ever actually claim to be God, or did the church invent that later? | 1 | 7/14 | `/two-reasons-skeptics-believe-jesus-is-not-god` (0.738) |
| ✓ | `swg-skeptic-gods-love` | If God supposedly loves everyone, how would I even know that's true and not just something Christians say? | 5 | 4/8 | `/faq/LGBTQ.html` (0.691) |
| ✓ | `swg-believer-assurance` | I've trusted Christ but I still doubt whether my salvation is really secure — what does the Bible say? | 1 | 5/12 | `/devotionals/doubting` (0.711) |
| ✓ | `swg-believer-holy-spirit` | How do I actually live day to day in the power of the Holy Spirit? | 1 | 5/12 | `/the-spirit-filled-life` (0.816) |
| ✓ | `swg-newcomer-gospel` | What's the core message of Christianity — what's it actually all about? | 3 | 3/8 | `/daily-devo/getting-to-know-you` (0.615) |
| ✓ | `swg-newcomer-baptism` | Do I need to be baptized to become a Christian? | 1 | 1/1 | `/questions/baptism.html` (0.716) |
| ✓ | `cru-newcomer-new-testament` | I want to start reading the New Testament but don't know how it's organized or where to begin — can you orient me? | 1 | 2/3 | `/knowing-god/bible.html` (0.688) |
| ✓ | `cru-believer-old-testament` | The Old Testament feels like a confusing jumble of names and events. How does the whole story actually hang together? | 1 | 4/5 | `/us/en/train-and-grow/bible-studies/how-to-take-on-the-old-testament-and-not-die-trying.html` (0.626) |
| ✓ | `cru-stewardship` | As a Christian, does God have a claim on my money — how am I supposed to handle my finances and possessions? | 2 | 2/4 | `/us/en/train-and-grow/bible-studies/financial-faithfulness/gods-view-on-wealth.html` (0.732) |
| ✓ | `cru-believer-witnessing` | I want to share my faith but I freeze up. How did Jesus himself approach people, and what does it take? | 1 | 6/11 | `/blog/evangelism-tips-non-evangelists` (0.764) |
| ✓ | `cru-believer-guidance` | How do I actually figure out what God wants me to do when I'm facing a hard decision? | 1 | 8/22 | `/us/en/train-and-grow/spiritual-growth/point-toward-gods-will.html` (0.766) |
| ✓ | `cru-believer-bible-study` | Is there a practical method for studying the Bible on my own, instead of just reading randomly? | 2 | 5/8 | `/how-to-read-the-bible` (0.735) |
| ✓ | `cru-newcomer-prayer` | I never know what to actually say when I pray. Is there a simple way to build a daily prayer habit? | 1 | 6/14 | `/us/en/train-and-grow/spiritual-growth/prayer/daily-prayer.html` (0.769) |
| ✓ | `cru-newcomer-holy-spirit` | Who exactly is the Holy Spirit, and what is he supposed to do in my life? | 1 | 4/7 | `/new-life/spirit-filled.html` (0.795) |
| ✓ | `cru-seeker-abundant-life` | Being a Christian honestly feels flat and rule-bound to me. Is there supposed to be more life to it than this? | 1 | 5/14 | `/you-cant-stay-seated-for-this` (0.669) |
| ✓ | `cru-skeptic-jesus-uniqueness` | Every religion has its founder. What actually sets Jesus apart from all the others? | 1 | 9/12 | `/wires/religions.html` (0.672) |
| ✓ | `jf-newcomer-who-is-jesus` | I don't really know anything about Jesus — who was he and what did he actually do? | 5 | 4/8 | `/us/en/train-and-grow/share-the-gospel/outreach-strategies/sometime/sometime-bible-study-week-1.html` (0.602) |
| ✓ | `jf-newcomer-why-jesus-died` | What was the point of Jesus dying on a cross — why did it have to happen? | 4 | 1/10 | `/blog/why-jesus-had-to-die` (0.769) |
| ✓ | `jf-newcomer-great-commission` | Christians keep talking about being 'sent to make disciples of all nations' — where's that from and what does it mean? | 1 | 5/10 | `/blog/great-commission-for` (0.725) |
| ✓ | `jf-skeptic-resurrection` | Christians stake everything on the resurrection — why would an empty tomb 2,000 years ago even matter? | 1 | 6/10 | `/jesus-resurrection-fact` (0.685) |
| ✓ | `jf-skeptic-bible-contradictions` | People say the Bible is riddled with contradictions and errors — how do you square that? | 1 | 4/5 | `/contradictions-skew-bible-truth` (0.782) |
| ✓ | `jf-skeptic-intolerant` | Isn't it arrogant for Christians to claim Jesus is the only way? That seems intolerant. | 1 | 6/8 | `/judge-not-cultural-tolerance` (0.680) |
| ✓ | `jf-believer-parable-sower` | What's Jesus really getting at in the story about a farmer scattering seed on different soils? | 1 | 1/1 | `/blog/parable-of-sower` (0.772) |
| ✓ | `jf-believer-good-samaritan` | What's the deeper point of the story about the man beaten on the road and the foreigner who stopped to help? | 2 | 1/1 | `/us/en/train-and-grow/bible-studies/thrive/different-leader.html` (0.680) |
| ✓ | `jf-believer-missional-everyday` | I'm not a missionary, just someone with a normal job — how do I actually live 'on mission' in ordinary life? | 2 | 6/12 | `/us/en/train-and-grow/leadership-training/sending-your-team/5thingsintro.html` (0.749) |
| ✓ | `jf-believer-disciple-making` | I want to help someone else grow in their faith, not just grow myself — where do I even start? | 3 | 3/6 | `/us/en/blog/life-and-relationships/your-community/the-power-of-community.html` (0.775) |
| ✓ | `jf-seeker-grief` | I just lost someone I love and I'm drowning — does Jesus have anything for someone grieving? | 1 | 6/10 | `/devotionals/a-man-like-us` (0.730) |
| ✓ | `jf-seeker-distant-god` | God feels distant and silent lately — how do I get close to him again? | 1 | 7/12 | `/devotionals/the-handprints-of-god` (0.763) |
| ✓ | `sl-skeptic-god-exists` | Is there any actual evidence that God exists, or is it just blind belief? | 2 | 4/7 | `/us/en/train-and-grow/share-the-gospel/obstacles-to-faith/does-god-exist-six-straight-forward-reasons.html` (0.689) |
| ✓ | `sl-skeptic-suffering` | If God is real and good, why is there so much suffering and evil in the world? | 1 | 5/14 | `/videos/is-god-good.html` (0.750) |
| ✓ | `sl-skeptic-science` | Hasn't science basically disproved religion? How can a thinking person believe in miracles? | 1 | 2/3 | `/science-disprove-miracles` (0.732) |
| ✓ | `sl-skeptic-morality` | I'm an atheist and a good person. Why would anyone need God to be moral? | 1 | 2/3 | `/good-without-god` (0.755) |
| ✓ | `sl-skeptic-gospels-reliable` | How can anyone trust the Gospels when they were written decades later by biased followers? | 1 | 9/13 | `/gospels-accurate-video-5` (0.750) |
| ✓ | `sl-skeptic-hidden-god` | If God wanted a relationship with me, why does he stay so hidden and silent? | 1 | 3/12 | `/when-god-feels-distant` (0.718) |
| ✓ | `sl-skeptic-copycat` | Isn't Jesus just a recycled myth — a copy of older dying-and-rising gods? | 1 | 2/2 | `/pagan-influences-gospels-reliable-video-6` (0.753) |
| ✓ | `sl-seeker-meaning` | Nothing in my life feels like it means anything. Is there actually a point to any of this? | 1 | 5/6 | `/feeling-purposeless-cause-cure` (0.660) |
| ✓ | `sl-believer-doubt` | I'm a Christian but I'm wracked with doubts and it scares me. Is doubting a sin? | 2 | 1/3 | `/us/en/blog/spiritual-growth/devotionals-quiet-times/why-are-christians-afraid-of-doubt.html` (0.789) |
| ✓ | `sl-believer-apologetics` | How do I have a productive conversation about faith with a skeptical friend without it turning into an argument? | 2 | 2/3 | `/us/en/train-and-grow/share-the-gospel/obstacles-to-faith/how-to-talk-to-a-skeptic.html` (0.799) |
| ✓ | `tl-seeker-grief-child` | My child died and I don't know how to keep going — does God have anything for a parent like me? | 1 | 6/10 | `/faith-after-losing-my-son` (0.730) |
| ✓ | `tl-seeker-abortion` | I had an abortion and I can't forgive myself — is there any healing for what I've done? | 1 | 2/6 | `/finding-freedom-from-the-shame-of-my-abortions` (0.753) |
| ✓ | `tl-seeker-depression` | I'm depressed and on antidepressants — can my faith and meds actually coexist? | 2 | 6/8 | `/us/en/blog/life-and-relationships/emotions/to-the-depressed-christian.html` (0.711) |
| ✓ | `tl-skeptic-cosmology` | Couldn't the universe just have come from nothing without needing a creator? | 1 | 7/7 | `/why-the-universe-from-nothing-is-a-non-starter` (0.724) |
| ✓ | `tl-skeptic-hell` | If God is loving, why would he send anyone to hell? | 1 | 2/3 | `/daily-devo/love-and-hell-dont-mix-do-they-2` (0.795) |
| ✓ | `tl-believer-marriage-drift` | Our marriage feels stale and we keep arguing — how do we keep it alive? | 1 | 9/20 | `/articles/topics/marriage/staying-married/romance-and-sex/have-you-lost-that-lovin-feeling` (0.635) |
| ✓ | `tl-believer-obedience` | Sometimes God seems to ask things I really don't want to do — how do I live in obedience when I'd rather not? | 1 | 8/14 | `/devotionals/sure-i-heard` (0.749) |
| ✓ | `tl-believer-disciple-new-christian` | My friend just trusted Christ for the first time — what does she need to know first, and how do I help her without overwhelming her? | 1 | 8/12 | `/they-said-yes-now-what` (0.786) |
| ✓ | `tl-newcomer-decision` | I think I just decided to trust Jesus — what now? What's the very next step? | 1 | 2/5 | `/yes` (0.688) |
| ✓ | `tl-newcomer-find-church` | I want to start going to church but I don't know how to pick one — what should I look for? | 2 | 4/6 | `/us/en/blog/life-and-relationships/your-community/choosing-church-home.html` (0.811) |
| ✓ | `fl-seeker-affair-trust` | My spouse had an affair and I don't know if I can ever trust them again — should I even try to save this? | 2 | 5/7 | `/articles/topics/marriage/troubled-marriage/infidelity/sharing-past-extramarital-affairs-with-your-spouse` (0.675) |
| ✓ | `fl-believer-spiritual-leader` | I want to be the spiritual leader of my family but I feel inadequate — where do I even start? | 1 | 8/9 | `/articles/topics/parenting/essentials/fathers/7-essentials-to-help-you-be-the-spiritual-leader-of-your-family` (0.745) |
| ✓ | `fl-seeker-teen-prodigal` | My teenager has walked away from God and I'm scared of losing them for good — what do I do? | 1 | 6/11 | `/equip/when-someone-you-love-is-losing-faith` (0.719) |
| ✓ | `fl-believer-teen-own-faith` | How do I help my teenager actually own their faith instead of just inheriting mine? | 1 | 6/9 | `/articles/topics/parenting/foundations/spiritual-development/10-ideas-to-challenge-your-teenage-son-to-make-his-faith-his-own` (0.779) |
| ✓ | `fl-seeker-single-parent` | I'm a single parent and I'm exhausted — does God have anything for someone doing this alone? | 1 | 5/8 | `/devotionals/going-it-alone` (0.738) |
| ✓ | `fl-newcomer-premarital` | What does the Bible say about preparing for marriage before the wedding? | 1 | 6/7 | `/articles/topics/marriage/getting-married/engagements-and-weddings/are-you-preparing-for-a-wedding-or-for-a-marriage` (0.723) |
| ✓ | `fl-skeptic-sex-marriage` | Why does Christianity insist on waiting until marriage for sex? It seems outdated. | 1 | 7/8 | `/devotionals/wise-intimacy` (0.742) |
| ✓ | `fl-seeker-blended-family` | Our blended family is full of conflict and the kids resent us — is there any hope? | 1 | 8/9 | `/articles/topics/blended-family/stepparents/stepfamily-living/stepfamily-dynamics-when-youre-not-blending` (0.715) |
| ✓ | `fl-believer-prodigal-adult` | My adult child has walked away from the faith — how do I keep praying without giving up? | 1 | 7/10 | `/equip/when-someone-you-love-is-losing-faith` (0.729) |
| ✓ | `fl-newcomer-discipline-child` | What's the biblical way to discipline a young child without crushing their spirit? | 1 | 6/6 | `/articles/topics/parenting/parenting-challenges/discipline/the-forgotten-part-of-discipline` (0.750) |
| ✓ | `tlfr-seeker-deuil-fils` | Mon fils est mort il y a quelques mois et je suis en colère contre Dieu — est-ce que ma foi peut survivre à ça ? | 1 | 5/9 | `/comment-garder-la-foi-apres-la-perte-de-mon-fils` (0.766) |
| ✓ | `tlfr-skeptic-dieu-existe` | Je suis athée : donnez-moi une seule bonne raison de penser qu'un dieu existe. | 1 | 9/20 | `/a/athee.html` (0.753) |
| ✓ | `tlfr-skeptic-resurrection` | Comment peut-on croire sérieusement qu'un homme mort est revenu à la vie il y a 2000 ans ? | 1 | 6/8 | `/jesus-est-il-ressuscite-a-la-vie-eternelle` (0.725) |
| ✓ | `tlfr-seeker-avortement` | J'ai avorté il y a des années et je n'arrive toujours pas à me le pardonner — est-ce qu'il y a une guérison possible pour moi ? | 1 | 4/6 | `/je-regrette-mon-avortement` (0.844) |
| ✓ | `tlfr-seeker-porno` | Je n'arrive pas à décrocher du porno et j'ai tellement honte — comment m'en sortir ? | 1 | 6/6 | `/a/511toxique.html` (0.766) |
| ✓ | `tlfr-believer-pardonner` | On m'a profondément blessé ; je sais que Dieu me demande de pardonner mais je n'y arrive pas — comment faire concrètement ? | 2 | 6/10 | `/je-ne-peux-pas-lui-pardonner-son-passe-sexuel` (0.785) |
| ✓ | `tlfr-believer-saint-esprit` | Ma vie chrétienne me semble plate et sans puissance — comment vivre chaque jour par la force du Saint-Esprit ? | 1 | 6/9 | `/une-vie-chretienne-dynamique` (0.746) |
| ✓ | `tlfr-believer-mari-incroyant` | Mon mari ne croit pas et je me sens seule dans ma foi — comment tenir et espérer qu'il rencontre Dieu un jour ? | 1 | 2/4 | `/le-salut-de-son-partenaire` (0.791) |
| ✓ | `tlfr-newcomer-jesus` | Je ne connais presque rien à Jésus — c'était qui, et qu'est-ce qu'il a fait de si important ? | 1 | 5/8 | `/a/201foiaveugle.html` (0.678) |
| ✓ | `tlfr-seeker-anxiete` | Mon cerveau n'arrête jamais de ressasser mes inquiétudes — comment retrouver une vraie paix intérieure ? | 1 | 8/8 | `/a/coronavirus.html` (0.668) |
| ✓ | `tlzh-newcomer-xinzhu` | 我想信耶稣，但不知道该怎么开始，第一步是什么？ | 2 | 2/2 | `/changing-power` (0.654) |
| ✓ | `tlzh-seeker-yiyi` | 我每天忙忙碌碌，却总觉得心里空空的，活着到底是为了什么？ | 2 | 3/4 | `/midlife` (0.533) |
| ✓ | `tlzh-seeker-youyu` | 我情绪低落了好几个月，什么都提不起劲，我该怎么走出来？ | 2 | 3/3 | `/give-yourself-a-new-life` (0.554) |
| ✓ | `tlzh-believer-raoshu` | 圣经教导要饶恕，可是那个人伤我太深，我真的做不到，怎么办？ | 3 | 1/2 | `/father-and-me` (0.576) |
| ✓ | `tlzh-seeker-waiyu` | 我发现配偶有了外遇，心都碎了——这段婚姻还有救吗？ | 2 | 2/3 | `/preventing-affairs` (0.544) |
| ✓ | `tlzh-believer-qingshaonian` | 家里的青少年越来越叛逆，说什么都顶嘴，做父母的该怎么跟他沟通？ | 1 | 3/3 | `/teen-rebellion` (0.675) |
| ✓ | `tlzh-newcomer-chengzhang` | 我刚刚决志信主，接下来该做些什么才能在信仰上成长？ | 1 | 3/4 | `/what-s-next` (0.685) |
| ✓ | `tlzh-seeker-yali` | 工作和生活的压力压得我喘不过气，快撑不住了，有什么出路？ | 1 | 4/4 | `/overcome-pressure` (0.562) |
| ✓ | `tlzh-skeptic-tianzai` | 如果真有一位慈爱的神，为什么世界上还有这么多天灾人祸？ | 1 | 1/1 | `/q-and-a` (0.619) |
| ✓ | `tlzh-believer-qiancai` | 作为基督徒，我该怎样看待赚钱和理财才合神心意？ | 1 | 3/3 | `/money-management` (0.655) |
| ✓ | `cru-believer-depressed-friend` | My flatmate has barely gotten out of bed in weeks and every time I try to cheer her up it lands wrong. How do I actually be there for her without making it worse? | 1 | 3/4 | `/us/en/blog/life-and-relationships/emotions/3-ways-to-care-for-your-depressed-friend.html` (0.642) |
| ✓ | `cru-believer-disciple-someone` | A guy in my church small group asked me to meet with him weekly and pour into him spiritually. I said yes and now I'm panicking — what do I actually do when we sit down? | 4 | 2/3 | `/us/en/train-and-grow/help-others-grow/discipleship/for-the-love-of-a-disciple.html` (0.725) |
| ✓ | `cru-believer-start-ministry` | There's nothing Christian happening on my campus and I keep thinking someone should start something. I'm 20 and no one has ever put me in charge of anything — is that even realistic? | 2 | 1/4 | `/us/en/train-and-grow/leadership-training/starting-a-ministry/launching/launching-1-eight-ways-to-start-a-ministry.html` (0.744) |
| ✓ | `cru-es-believer-dios-callado` | Le pido a Dios lo mismo una y otra vez y no obtengo respuesta. ¿Por qué se queda callado conmigo? | 1 | 4/4 | `/mx/es/crecer-y-equipar/crecimiento-espiritual/oracion/cosas-que-hacer-cuando-dios-guarda-silencio.html` (0.737) |
| ✓ | `cru-es-believer-evangelismo-trabajo` | Quiero hablarles de Jesús a mis compañeros de trabajo pero me da una vergüenza tremenda y no sé ni cómo sacar el tema. | 1 | 3/6 | `/mx/es/crecer-y-equipar/comparte-evangelio/estrategias-evangelismo/como-incorporar-tu-fe-al-trabajo.html` (0.708) |
| ✓ | `cru-es-believer-pecado-recurrente` | Caigo una y otra vez en el mismo pecado, me arrepiento y a los dos días vuelvo a lo mismo. ¿Cómo rompo ese círculo? | 5 | 1/1 | `/mx/es/crecer-y-equipar/vida-y-relaciones/men/recurring-sin.html` (0.649) |
| ✓ | `cru-es-newcomer-tiempo-diario` | Acabo de entregarle mi vida a Cristo. ¿Cómo hago para pasar un rato con Dios cada día sin que se me haga aburrido? | 1 | 2/2 | `/mx/es/crecer-y-equipar/crecimiento-espiritual/devocionales/a-daily-time-with-the-lord.html` (0.739) |
| ✓ | `cru-es-seeker-desanimo` | Llevo meses sin ganas de nada, me levanto y solo quiero volver a la cama. ¿A Dios le importa cómo me siento? | 3 | 3/3 | `/mx/es/crecer-y-equipar/crecimiento-espiritual/devocionales/advice-for-the-weary-at-heart.html` (0.626) |
| ✓ | `cru-es-seeker-vacio` | Tengo trabajo, pareja, todo lo que supuestamente debería hacerme feliz, y por dentro me siento vacío. ¿Qué me falta? | 1 | 1/1 | `/mx/es/conoce-a-dios/mi-historia-una-vida-cambiada/si-estas-con-el-quien-contra-ti.html` (0.620) |
| ✓ | `cru-es-skeptic-infierno` | Si Dios es tan bueno, ¿cómo se justifica que mande gente a quemarse para siempre? | 2 | 1/1 | `/mx/es/crecer-y-equipar/crecimiento-espiritual/core-christian-beliefs/heaven-and-hell.html` (0.638) |
| ✓ | `cru-es-skeptic-jesus-hombre` | No me trago que un tipo de hace dos mil años sea Dios. ¿Qué pruebas hay de que no fue solo un maestro más? | 1 | 3/3 | `/mx/es/crecer-y-equipar/crecimiento-espiritual/core-christian-beliefs/beyond-blind-faith.html` (0.649) |
| ✓ | `cru-newcomer-ordinary-testimony` | People at church give these dramatic testimonies and mine is just — I grew up believing, nothing happened to me. Why would anyone care about that? Is it even worth telling? | 1 | 1/2 | `/blog/what-if-you-dont-have-dramatic-christian-testimony` (0.693) |
| ✓ | `cru-seeker-ethnic-identity` | Church always feels like a white space where my background is something I'm supposed to leave at the door. Does following Jesus mean giving up where I come from? | 3 | 1/4 | `/devotionals/i-dont-belong-here` (0.652) |
| ✓ | `cru-skeptic-hell` | A loving God who tortures people forever just for believing the wrong thing? That's the part I can't get past. How do you defend that? | 2 | 2/2 | `/what-keeps-you-from-loving-god` (0.658) |
| ✓ | `es-seeker-loneliness` | Everyone around me seems to have people, and I just feel invisible and completely alone — does God even see me? | 1 | 7/11 | `/devotionals/no-longer-invisible` (0.726) |
| ✓ | `es-seeker-self-hatred` | I look in the mirror and hate the person staring back. Could God really love someone who can't stand themselves? | 1 | 6/13 | `/daily-devo/how-can-anyone-love-a-mess-like-this` (0.680) |
| ✓ | `es-seeker-fear-of-death` | I lie awake at night terrified of dying. What actually happens to us when we die? | 1 | 3/3 | `/have-you-heard-about-henry` (0.660) |
| ✓ | `es-newcomer-same-god` | Do all religions basically worship the same God, just in different ways? | 1 | 8/8 | `/features/religions-of-the-world.html` (0.643) |
| ✓ | `es-newcomer-astrology` | I check my horoscope every morning and I'm pretty into astrology — is there anything actually wrong with that? | 2 | 1/1 | `/faq/astrology.html` (0.583) |
| ✓ | `es-skeptic-scientists` | Name one serious scientist who actually believes in God. People who understand how the world works don't buy this stuff, right? | 1 | 3/3 | `/christianity-science-bogus-feud` (0.605) |
| ✓ | `es-seeker-muslim-background` | I grew up Muslim and lately I can't stop wondering about who Jesus really is. What do Christians claim about him that Islam doesn't? | 1 | 8/10 | `/us/en/train-and-grow/spiritual-growth/core-christian-beliefs/what-makes-christianity-different.html` (0.677) |
| ✓ | `es-newcomer-reincarnation` | Is reincarnation real? Do we keep coming back as someone else until we get it right? | 1 | 1/1 | `/forum/reincarnation.html` (0.597) |
| ✓ | `es-newcomer-denominations` | I'm brand new to all this and confused — Catholic, Baptist, Pentecostal... how am I supposed to know which church is the right one? | 1 | 3/3 | `/how-to-choose-a-church` (0.664) |
| ✓ | `es-skeptic-show-miracle` | If God wants people to believe in him, why doesn't he just do an obvious miracle on live TV and settle it? | 1 | 1/1 | `/forum/miracles2.html` (0.731) |
| ✓ | `esar-skeptic-tahrif` | أصدقائي يقولون إن الكتاب الذي بين أيدي المسيحيين اليوم غير الذي نزل من عند الله وأنه تبدّل عبر القرون. ما ردّكم على هذا؟ | 1 | 4/4 | `/a/jesusinislam.html` (0.745) |
| ✓ | `esar-seeker-trinity` | لا أستطيع أن أستوعب كيف يكون الله واحداً وثلاثة في الوقت نفسه. أليس هذا تناقضاً عقلياً؟ | 1 | 1/1 | `/a/trinity.html` (0.744) |
| ✓ | `esar-skeptic-child-suffering` | إذا كان الله رحيماً وقادراً على كل شيء، فلماذا يترك طفلاً بريئاً يُغتصب ولا يحرّك ساكناً؟ | 1 | 2/2 | `/a/childraped.html` (0.785) |
| ✓ | `esar-seeker-anxiety` | قلبي مشدود طوال الوقت وأفكاري لا تتوقف في الليل، وأشعر أن التوتر يأكلني. كيف أجد راحة؟ | 1 | 2/2 | `/a/tense2.html` (0.641) |
| ✓ | `esar-newcomer-who-is-jesus` | سمعت أن المسيحيين يعتبرون عيسى أكثر من مجرد نبي. على أي أساس يقولون هذا؟ | 1 | 3/4 | `/a/jesusinislam.html` (0.610) |
| ✓ | `esar-skeptic-evidence` | أنا لا أصدّق إلا ما أراه وألمسه. أعطني دليلاً علمياً واحداً على وجود خالق. | 1 | 4/4 | `/a/universe.html` (0.659) |
| ✓ | `esar-seeker-porn` | أدمنت مشاهدة المقاطع الإباحية ولا أستطيع التوقف، وكلما حاولت رجعت وأنا أشعر بالخزي. هل هناك مخرج؟ | 1 | 1/1 | `/a/toxic.html` (0.784) |
| ✓ | `esar-seeker-women-worth` | كامرأة في مجتمعنا الشرقي أشعر أن قيمتي أقل من الرجل. هل ينظر الدين إليّ نظرة مختلفة؟ | 1 | 1/1 | `/a/fem.html` (0.624) |
| ✓ | `esar-newcomer-after-death` | أفكر كثيراً في النهاية — هل هناك شيء بعد القبر أم أن كل شيء ينتهي هناك؟ | 1 | 1/1 | `/a/then.html` (0.682) |
| ✓ | `esar-seeker-emptiness` | عندي تقريباً كل ما تمنيته، ومع ذلك أحسّ بفراغ في داخلي لا أعرف كيف أملأه. ما الذي ينقصني؟ | 4 | 2/2 | `/a/wolves.html` (0.692) |
| ✓ | `esar-skeptic-which-god` | كل دين يدّعي أنه الطريق الصحيح. لماذا أختار إلهكم أنتم دون بقية الآلهة؟ | 1 | 4/4 | `/a/whypick.html` (0.604) |
| ✓ | `esar-believer-forgiveness` | شخص قريب جرحني جرحاً عميقاً، والجميع يقول لي سامح. كيف أسامح وأنا ما زلت أتألم؟ | 1 | 1/1 | `/a/forgiveness.html` (0.642) |
| ✓ | `esfr-newcomer-religions` | Toutes les religions ne mènent-elles pas au même Dieu, au fond ? | 1 | 4/5 | `/a/205divin.html` (0.670) |
| ✓ | `esfr-seeker-sens-vie` | Je me lève chaque matin sans savoir à quoi je sers — est-ce que ma vie a un sens ? | 1 | 3/4 | `/a/305but.html` (0.673) |
| ✓ | `esfr-seeker-peur-mort` | J'ai peur de mourir et je ne sais pas ce qu'il y a après — est-ce que quelqu'un peut me le dire ? | 1 | 4/4 | `/a/608apres.html` (0.743) |
| ✓ | `esfr-skeptic-enfer` | Un châtiment infini pour une vie finie, comment est-ce que ça peut être juste ? | 2 | 2/3 | `/a/260islam.html` (0.616) |
| ✓ | `esfr-newcomer-trinite` | On me dit qu'il y a un seul Dieu mais aussi le Père, le Fils et l'Esprit — comment ça marche ? | 1 | 2/2 | `/a/709trinite.html` (0.748) |
| ✓ | `esfr-seeker-apparence` | Je déteste mon reflet et je me compare sans arrêt aux autres — est-ce que je vaux quelque chose ? | 1 | 5/5 | `/a/509beaute.html` (0.617) |
| ✓ | `esfr-seeker-lgbt` | Je suis lesbienne et l'église m'a rejetée — est-ce que Dieu peut encore m'aimer ? | 1 | 2/2 | `/a/homosexuel-lesbienne.html` (0.770) |
| ✓ | `esfr-believer-priere-sans-reponse` | Je prie depuis des mois pour la même chose et rien ne bouge — est-ce que Dieu écoute ? | 1 | 2/3 | `/a/306lapriere.html` (0.755) |
| ✓ | `esfr-skeptic-islam-jesus` | Les musulmans disent que Jésus était un prophète, pas le Fils de Dieu — qui a raison ? | 1 | 5/5 | `/voir-dieu-face-a-face` (0.706) |
| ✓ | `esfr-newcomer-catholique` | Ma famille est catholique mais des amis me disent que je ne suis pas vraiment chrétien — qui a raison ? | 1 | 1/1 | `/a/723catholique.html` (0.768) |
| ✓ | `esfr-skeptic-racisme` | La religion a servi à justifier l'esclavage et à maintenir les femmes en bas — pourquoi lui faire confiance ? | 1 | 2/2 | `/a/MLK-et-le-racisme.html` (0.631) |
| ✓ | `esfr-seeker-mariage` | Avec tous les divorces autour de moi, est-ce que ça vaut encore le coup de se marier ? | 1 | 3/3 | `/a/502mariage.html` (0.747) |
