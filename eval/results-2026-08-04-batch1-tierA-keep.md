# Eval results — 2026-08-04T02:04:10.828Z

**Model:** `qwen/qwen3-embedding-8b`
**Top-k:** 10
**Scope:** whole-corpus
**Cases:** 270

## Metrics

_recall + coverage lead; P@1/MRR secondary — see docs/eval-approach.md._

| Metric | Value |
|--------|-------|
| recall@3 | 0.956 |
| recall@10 | 1.000 |
| coverage | 0.841 |
| MRR | 0.857 |
| precision@1 | 0.759 |

## Per-source coverage

(cases where the source has a relevant doc — recall = any of its docs returned; coverage = mean fraction returned)

| source | cases | recall | coverage |
|--------|------:|-------:|---------:|
| `cru` | 36 | 0.861 | 0.626 |
| `everystudent` | 22 | 0.773 | 0.693 |
| `everystudent-ar` | 12 | 1.000 | 0.979 |
| `everystudent-bg` | 10 | 1.000 | 0.975 |
| `everystudent-cs` | 10 | 1.000 | 0.980 |
| `everystudent-es` | 13 | 1.000 | 0.956 |
| `everystudent-fa` | 10 | 1.000 | 0.967 |
| `everystudent-fr` | 18 | 1.000 | 0.856 |
| `everystudent-hu` | 10 | 1.000 | 0.980 |
| `everystudent-ja` | 10 | 1.000 | 0.980 |
| `everystudent-mn` | 10 | 1.000 | 0.867 |
| `everystudent-pl` | 10 | 1.000 | 1.000 |
| `everystudent-pt` | 10 | 1.000 | 0.983 |
| `everystudent-ru` | 10 | 1.000 | 0.950 |
| `everystudent-sk` | 10 | 1.000 | 0.950 |
| `everystudent-sq` | 10 | 1.000 | 0.908 |
| `everystudent-tr` | 10 | 1.000 | 0.947 |
| `everystudent-zh-cn` | 15 | 0.933 | 0.864 |
| `everystudent-zh-tw` | 3 | 0.667 | 0.500 |
| `familylife` | 23 | 0.913 | 0.745 |
| `jesusfilm-org` | 30 | 0.667 | 0.537 |
| `sightline-ministry` | 46 | 0.783 | 0.559 |
| `starting-with-god` | 24 | 0.458 | 0.375 |
| `thelife` | 41 | 0.854 | 0.622 |
| `thelife-fr` | 18 | 1.000 | 0.778 |
| `thelife-zh` | 10 | 1.000 | 0.733 |

## Per-language coverage

(grouped by each case's resolved retrieval language. A multi-language source
like `cru` blends its languages in the per-source view above — this splits them.
`(unscoped)` means no language was derivable: the case searched the whole
multilingual corpus, which is a case-configuration bug, not a result.)

| language | cases | recall@10 | coverage |
|----------|------:|----------:|---------:|
| `ar` | 12 | 1.000 | 0.979 |
| `bg` | 10 | 1.000 | 0.975 |
| `cs` | 10 | 1.000 | 0.980 |
| `en` | 78 | 1.000 | 0.639 |
| `es` | 18 | 1.000 | 0.938 |
| `fa` | 10 | 1.000 | 0.967 |
| `fr` | 22 | 1.000 | 0.804 |
| `hu` | 10 | 1.000 | 0.980 |
| `ja` | 10 | 1.000 | 0.980 |
| `mn` | 10 | 1.000 | 0.867 |
| `pl` | 10 | 1.000 | 1.000 |
| `pt` | 10 | 1.000 | 0.983 |
| `ru` | 10 | 1.000 | 0.950 |
| `sk` | 10 | 1.000 | 0.950 |
| `sq` | 10 | 1.000 | 0.908 |
| `tr` | 10 | 1.000 | 0.947 |
| `zh` | 20 | 1.000 | 0.804 |

## Per-evidence-tier coverage

(how reviewable the OPERATOR's evidence was — not how good the case is.
`human-verified` = approved on content a reviewer could read or check;
`llm-translated` = approved on a machine translation nobody available can
verify. `(untagged)` = authored before the tier existed. Kept apart so a
machine-translated language's number is never averaged into a checked one.)

| tier | cases | recall@10 | coverage |
|------|------:|----------:|---------:|
| `(untagged)` | 130 | 1.000 | 0.720 |
| `llm-translated` | 140 | 1.000 | 0.953 |

## Per-case

| | id | question | first rank | coverage | top hit |
|---|----|----------|-----------|----------|---------|
| ✓ | `swg-seeker-anxiety` | My mind races with anxiety constantly and I can't switch it off — is there a way to actually find peace? | 2 | 9/19 | `/faq/peace.html` (0.741) |
| ✓ | `swg-seeker-failure` | I keep messing up and feel like God must be so disappointed in me. Is there any hope? | 1 | 5/22 | `/hope-not-wishful-thinking-for-christians` (0.714) |
| ✓ | `swg-seeker-porn` | I can't stop looking at porn and I hate myself for it — is there any way out? | 1 | 1/3 | `/struggles/how-to-get-free-from-porn.html` (0.716) |
| ✓ | `swg-skeptic-faith-proof` | Isn't faith just believing something with no proof? Sounds like wishful thinking. | 2 | 3/6 | `/devotionals/if-only-i-could-see` (0.658) |
| ✓ | `swg-skeptic-jesus-deity` | Did Jesus ever actually claim to be God, or did the church invent that later? | 1 | 7/14 | `/two-reasons-skeptics-believe-jesus-is-not-god` (0.737) |
| ✓ | `swg-skeptic-gods-love` | If God supposedly loves everyone, how would I even know that's true and not just something Christians say? | 5 | 4/8 | `/faq/LGBTQ.html` (0.691) |
| ✓ | `swg-believer-assurance` | I've trusted Christ but I still doubt whether my salvation is really secure — what does the Bible say? | 1 | 5/12 | `/devotionals/doubting` (0.711) |
| ✓ | `swg-believer-holy-spirit` | How do I actually live day to day in the power of the Holy Spirit? | 1 | 5/12 | `/the-spirit-filled-life` (0.816) |
| ✓ | `swg-newcomer-gospel` | What's the core message of Christianity — what's it actually all about? | 3 | 3/8 | `/daily-devo/getting-to-know-you` (0.615) |
| ✓ | `swg-newcomer-baptism` | Do I need to be baptized to become a Christian? | 1 | 1/1 | `/questions/baptism.html` (0.716) |
| ✓ | `cru-newcomer-new-testament` | I want to start reading the New Testament but don't know how it's organized or where to begin — can you orient me? | 1 | 2/3 | `/knowing-god/bible.html` (0.688) |
| ✓ | `cru-believer-old-testament` | The Old Testament feels like a confusing jumble of names and events. How does the whole story actually hang together? | 1 | 4/5 | `/us/en/train-and-grow/bible-studies/how-to-take-on-the-old-testament-and-not-die-trying.html` (0.625) |
| ✓ | `cru-stewardship` | As a Christian, does God have a claim on my money — how am I supposed to handle my finances and possessions? | 2 | 2/4 | `/us/en/train-and-grow/bible-studies/financial-faithfulness/gods-view-on-wealth.html` (0.732) |
| ✓ | `cru-believer-witnessing` | I want to share my faith but I freeze up. How did Jesus himself approach people, and what does it take? | 1 | 6/11 | `/blog/evangelism-tips-non-evangelists` (0.764) |
| ✓ | `cru-believer-guidance` | How do I actually figure out what God wants me to do when I'm facing a hard decision? | 1 | 8/22 | `/us/en/train-and-grow/spiritual-growth/point-toward-gods-will.html` (0.766) |
| ✓ | `cru-believer-bible-study` | Is there a practical method for studying the Bible on my own, instead of just reading randomly? | 2 | 5/8 | `/how-to-read-the-bible` (0.735) |
| ✓ | `cru-newcomer-prayer` | I never know what to actually say when I pray. Is there a simple way to build a daily prayer habit? | 1 | 6/14 | `/us/en/train-and-grow/spiritual-growth/prayer/daily-prayer.html` (0.768) |
| ✓ | `cru-newcomer-holy-spirit` | Who exactly is the Holy Spirit, and what is he supposed to do in my life? | 1 | 4/7 | `/new-life/spirit-filled.html` (0.794) |
| ✓ | `cru-seeker-abundant-life` | Being a Christian honestly feels flat and rule-bound to me. Is there supposed to be more life to it than this? | 1 | 5/14 | `/you-cant-stay-seated-for-this` (0.669) |
| ✓ | `cru-skeptic-jesus-uniqueness` | Every religion has its founder. What actually sets Jesus apart from all the others? | 1 | 9/12 | `/wires/religions.html` (0.672) |
| ✓ | `jf-newcomer-who-is-jesus` | I don't really know anything about Jesus — who was he and what did he actually do? | 5 | 4/8 | `/us/en/train-and-grow/share-the-gospel/outreach-strategies/sometime/sometime-bible-study-week-1.html` (0.602) |
| ✓ | `jf-newcomer-why-jesus-died` | What was the point of Jesus dying on a cross — why did it have to happen? | 4 | 1/10 | `/blog/why-jesus-had-to-die` (0.768) |
| ✓ | `jf-newcomer-great-commission` | Christians keep talking about being 'sent to make disciples of all nations' — where's that from and what does it mean? | 1 | 5/10 | `/blog/great-commission-for` (0.725) |
| ✓ | `jf-skeptic-resurrection` | Christians stake everything on the resurrection — why would an empty tomb 2,000 years ago even matter? | 1 | 6/10 | `/jesus-resurrection-fact` (0.686) |
| ✓ | `jf-skeptic-bible-contradictions` | People say the Bible is riddled with contradictions and errors — how do you square that? | 1 | 4/5 | `/contradictions-skew-bible-truth` (0.783) |
| ✓ | `jf-skeptic-intolerant` | Isn't it arrogant for Christians to claim Jesus is the only way? That seems intolerant. | 1 | 6/8 | `/judge-not-cultural-tolerance` (0.680) |
| ✓ | `jf-believer-parable-sower` | What's Jesus really getting at in the story about a farmer scattering seed on different soils? | 1 | 1/1 | `/blog/parable-of-sower` (0.771) |
| ✓ | `jf-believer-good-samaritan` | What's the deeper point of the story about the man beaten on the road and the foreigner who stopped to help? | 2 | 1/1 | `/us/en/train-and-grow/bible-studies/thrive/different-leader.html` (0.679) |
| ✓ | `jf-believer-missional-everyday` | I'm not a missionary, just someone with a normal job — how do I actually live 'on mission' in ordinary life? | 2 | 6/12 | `/us/en/train-and-grow/leadership-training/sending-your-team/5thingsintro.html` (0.749) |
| ✓ | `jf-believer-disciple-making` | I want to help someone else grow in their faith, not just grow myself — where do I even start? | 3 | 3/6 | `/us/en/blog/life-and-relationships/your-community/the-power-of-community.html` (0.775) |
| ✓ | `jf-seeker-grief` | I just lost someone I love and I'm drowning — does Jesus have anything for someone grieving? | 1 | 6/10 | `/devotionals/a-man-like-us` (0.730) |
| ✓ | `jf-seeker-distant-god` | God feels distant and silent lately — how do I get close to him again? | 1 | 7/12 | `/devotionals/the-handprints-of-god` (0.762) |
| ✓ | `sl-skeptic-god-exists` | Is there any actual evidence that God exists, or is it just blind belief? | 3 | 4/7 | `/wires/atheist.html` (0.693) |
| ✓ | `sl-skeptic-suffering` | If God is real and good, why is there so much suffering and evil in the world? | 1 | 5/14 | `/videos/is-god-good.html` (0.751) |
| ✓ | `sl-skeptic-science` | Hasn't science basically disproved religion? How can a thinking person believe in miracles? | 1 | 2/3 | `/science-disprove-miracles` (0.733) |
| ✓ | `sl-skeptic-morality` | I'm an atheist and a good person. Why would anyone need God to be moral? | 1 | 2/3 | `/good-without-god` (0.755) |
| ✓ | `sl-skeptic-gospels-reliable` | How can anyone trust the Gospels when they were written decades later by biased followers? | 1 | 8/13 | `/gospels-accurate-video-5` (0.751) |
| ✓ | `sl-skeptic-hidden-god` | If God wanted a relationship with me, why does he stay so hidden and silent? | 1 | 3/12 | `/when-god-feels-distant` (0.717) |
| ✓ | `sl-skeptic-copycat` | Isn't Jesus just a recycled myth — a copy of older dying-and-rising gods? | 1 | 2/2 | `/pagan-influences-gospels-reliable-video-6` (0.753) |
| ✓ | `sl-seeker-meaning` | Nothing in my life feels like it means anything. Is there actually a point to any of this? | 1 | 5/6 | `/feeling-purposeless-cause-cure` (0.661) |
| ✓ | `sl-believer-doubt` | I'm a Christian but I'm wracked with doubts and it scares me. Is doubting a sin? | 2 | 1/3 | `/us/en/blog/spiritual-growth/devotionals-quiet-times/why-are-christians-afraid-of-doubt.html` (0.789) |
| ✓ | `sl-believer-apologetics` | How do I have a productive conversation about faith with a skeptical friend without it turning into an argument? | 2 | 2/3 | `/us/en/train-and-grow/share-the-gospel/obstacles-to-faith/how-to-talk-to-a-skeptic.html` (0.799) |
| ✓ | `tl-seeker-grief-child` | My child died and I don't know how to keep going — does God have anything for a parent like me? | 1 | 6/10 | `/faith-after-losing-my-son` (0.730) |
| ✓ | `tl-seeker-abortion` | I had an abortion and I can't forgive myself — is there any healing for what I've done? | 1 | 2/6 | `/finding-freedom-from-the-shame-of-my-abortions` (0.753) |
| ✓ | `tl-seeker-depression` | I'm depressed and on antidepressants — can my faith and meds actually coexist? | 2 | 6/8 | `/us/en/blog/life-and-relationships/emotions/to-the-depressed-christian.html` (0.711) |
| ✓ | `tl-skeptic-cosmology` | Couldn't the universe just have come from nothing without needing a creator? | 1 | 7/7 | `/why-the-universe-from-nothing-is-a-non-starter` (0.724) |
| ✓ | `tl-skeptic-hell` | If God is loving, why would he send anyone to hell? | 1 | 2/3 | `/daily-devo/love-and-hell-dont-mix-do-they-2` (0.795) |
| ✓ | `tl-believer-marriage-drift` | Our marriage feels stale and we keep arguing — how do we keep it alive? | 1 | 9/20 | `/articles/topics/marriage/staying-married/romance-and-sex/have-you-lost-that-lovin-feeling` (0.635) |
| ✓ | `tl-believer-obedience` | Sometimes God seems to ask things I really don't want to do — how do I live in obedience when I'd rather not? | 1 | 8/14 | `/devotionals/sure-i-heard` (0.748) |
| ✓ | `tl-believer-disciple-new-christian` | My friend just trusted Christ for the first time — what does she need to know first, and how do I help her without overwhelming her? | 1 | 8/12 | `/they-said-yes-now-what` (0.787) |
| ✓ | `tl-newcomer-decision` | I think I just decided to trust Jesus — what now? What's the very next step? | 1 | 2/5 | `/yes` (0.689) |
| ✓ | `tl-newcomer-find-church` | I want to start going to church but I don't know how to pick one — what should I look for? | 2 | 4/6 | `/us/en/blog/life-and-relationships/your-community/choosing-church-home.html` (0.811) |
| ✓ | `fl-seeker-affair-trust` | My spouse had an affair and I don't know if I can ever trust them again — should I even try to save this? | 2 | 5/7 | `/articles/topics/marriage/troubled-marriage/infidelity/sharing-past-extramarital-affairs-with-your-spouse` (0.676) |
| ✓ | `fl-believer-spiritual-leader` | I want to be the spiritual leader of my family but I feel inadequate — where do I even start? | 1 | 8/9 | `/articles/topics/parenting/essentials/fathers/7-essentials-to-help-you-be-the-spiritual-leader-of-your-family` (0.745) |
| ✓ | `fl-seeker-teen-prodigal` | My teenager has walked away from God and I'm scared of losing them for good — what do I do? | 1 | 6/11 | `/equip/when-someone-you-love-is-losing-faith` (0.721) |
| ✓ | `fl-believer-teen-own-faith` | How do I help my teenager actually own their faith instead of just inheriting mine? | 1 | 6/9 | `/articles/topics/parenting/foundations/spiritual-development/10-ideas-to-challenge-your-teenage-son-to-make-his-faith-his-own` (0.778) |
| ✓ | `fl-seeker-single-parent` | I'm a single parent and I'm exhausted — does God have anything for someone doing this alone? | 1 | 5/8 | `/devotionals/going-it-alone` (0.739) |
| ✓ | `fl-newcomer-premarital` | What does the Bible say about preparing for marriage before the wedding? | 1 | 6/7 | `/articles/topics/marriage/getting-married/engagements-and-weddings/are-you-preparing-for-a-wedding-or-for-a-marriage` (0.724) |
| ✓ | `fl-skeptic-sex-marriage` | Why does Christianity insist on waiting until marriage for sex? It seems outdated. | 1 | 7/8 | `/devotionals/wise-intimacy` (0.742) |
| ✓ | `fl-seeker-blended-family` | Our blended family is full of conflict and the kids resent us — is there any hope? | 1 | 8/9 | `/articles/topics/blended-family/stepparents/stepfamily-living/stepfamily-dynamics-when-youre-not-blending` (0.714) |
| ✓ | `fl-believer-prodigal-adult` | My adult child has walked away from the faith — how do I keep praying without giving up? | 1 | 7/10 | `/equip/when-someone-you-love-is-losing-faith` (0.729) |
| ✓ | `fl-newcomer-discipline-child` | What's the biblical way to discipline a young child without crushing their spirit? | 1 | 6/6 | `/articles/topics/parenting/parenting-challenges/discipline/the-forgotten-part-of-discipline` (0.750) |
| ✓ | `tlfr-seeker-deuil-fils` | Mon fils est mort il y a quelques mois et je suis en colère contre Dieu — est-ce que ma foi peut survivre à ça ? | 1 | 5/9 | `/comment-garder-la-foi-apres-la-perte-de-mon-fils` (0.767) |
| ✓ | `tlfr-skeptic-dieu-existe` | Je suis athée : donnez-moi une seule bonne raison de penser qu'un dieu existe. | 1 | 9/20 | `/a/athee.html` (0.753) |
| ✓ | `tlfr-skeptic-resurrection` | Comment peut-on croire sérieusement qu'un homme mort est revenu à la vie il y a 2000 ans ? | 1 | 6/8 | `/jesus-est-il-ressuscite-a-la-vie-eternelle` (0.725) |
| ✓ | `tlfr-seeker-avortement` | J'ai avorté il y a des années et je n'arrive toujours pas à me le pardonner — est-ce qu'il y a une guérison possible pour moi ? | 1 | 4/6 | `/je-regrette-mon-avortement` (0.844) |
| ✓ | `tlfr-seeker-porno` | Je n'arrive pas à décrocher du porno et j'ai tellement honte — comment m'en sortir ? | 1 | 6/6 | `/a/511toxique.html` (0.766) |
| ✓ | `tlfr-believer-pardonner` | On m'a profondément blessé ; je sais que Dieu me demande de pardonner mais je n'y arrive pas — comment faire concrètement ? | 2 | 6/10 | `/je-ne-peux-pas-lui-pardonner-son-passe-sexuel` (0.786) |
| ✓ | `tlfr-believer-saint-esprit` | Ma vie chrétienne me semble plate et sans puissance — comment vivre chaque jour par la force du Saint-Esprit ? | 1 | 6/9 | `/une-vie-chretienne-dynamique` (0.745) |
| ✓ | `tlfr-believer-mari-incroyant` | Mon mari ne croit pas et je me sens seule dans ma foi — comment tenir et espérer qu'il rencontre Dieu un jour ? | 1 | 2/4 | `/le-salut-de-son-partenaire` (0.790) |
| ✓ | `tlfr-newcomer-jesus` | Je ne connais presque rien à Jésus — c'était qui, et qu'est-ce qu'il a fait de si important ? | 1 | 5/8 | `/a/201foiaveugle.html` (0.677) |
| ✓ | `tlfr-seeker-anxiete` | Mon cerveau n'arrête jamais de ressasser mes inquiétudes — comment retrouver une vraie paix intérieure ? | 1 | 8/8 | `/a/coronavirus.html` (0.668) |
| ✓ | `tlzh-newcomer-xinzhu` | 我想信耶稣，但不知道该怎么开始，第一步是什么？ | 3 | 1/3 | `/a/gaylesbian.html` (0.660) |
| ✓ | `tlzh-seeker-yiyi` | 我每天忙忙碌碌，却总觉得心里空空的，活着到底是为了什么？ | 1 | 5/7 | `/a/purpose.html` (0.585) |
| ✓ | `tlzh-seeker-youyu` | 我情绪低落了好几个月，什么都提不起劲，我该怎么走出来？ | 2 | 3/3 | `/give-yourself-a-new-life` (0.554) |
| ✓ | `tlzh-believer-raoshu` | 圣经教导要饶恕，可是那个人伤我太深，我真的做不到，怎么办？ | 5 | 1/2 | `/father-and-me` (0.576) |
| ✓ | `tlzh-seeker-waiyu` | 我发现配偶有了外遇，心都碎了——这段婚姻还有救吗？ | 2 | 3/4 | `/preventing-affairs` (0.545) |
| ✓ | `tlzh-believer-qingshaonian` | 家里的青少年越来越叛逆，说什么都顶嘴，做父母的该怎么跟他沟通？ | 1 | 3/3 | `/teen-rebellion` (0.675) |
| ✓ | `tlzh-newcomer-chengzhang` | 我刚刚决志信主，接下来该做些什么才能在信仰上成长？ | 1 | 2/4 | `/what-s-next` (0.686) |
| ✓ | `tlzh-seeker-yali` | 工作和生活的压力压得我喘不过气，快撑不住了，有什么出路？ | 1 | 5/6 | `/overcome-pressure` (0.563) |
| ✓ | `tlzh-skeptic-tianzai` | 如果真有一位慈爱的神，为什么世界上还有这么多天灾人祸？ | 1 | 9/11 | `/a/isgodgood.html` (0.741) |
| ✓ | `tlzh-believer-qiancai` | 作为基督徒，我该怎样看待赚钱和理财才合神心意？ | 1 | 2/3 | `/money-management` (0.656) |
| ✓ | `cru-believer-depressed-friend` | My flatmate has barely gotten out of bed in weeks and every time I try to cheer her up it lands wrong. How do I actually be there for her without making it worse? | 1 | 3/4 | `/us/en/blog/life-and-relationships/emotions/3-ways-to-care-for-your-depressed-friend.html` (0.642) |
| ✓ | `cru-believer-disciple-someone` | A guy in my church small group asked me to meet with him weekly and pour into him spiritually. I said yes and now I'm panicking — what do I actually do when we sit down? | 4 | 2/3 | `/us/en/train-and-grow/help-others-grow/discipleship/for-the-love-of-a-disciple.html` (0.725) |
| ✓ | `cru-believer-start-ministry` | There's nothing Christian happening on my campus and I keep thinking someone should start something. I'm 20 and no one has ever put me in charge of anything — is that even realistic? | 2 | 1/4 | `/us/en/train-and-grow/leadership-training/starting-a-ministry/launching/launching-1-eight-ways-to-start-a-ministry.html` (0.745) |
| ✓ | `cru-es-believer-dios-callado` | Le pido a Dios lo mismo una y otra vez y no obtengo respuesta. ¿Por qué se queda callado conmigo? | 1 | 5/5 | `/mx/es/crecer-y-equipar/crecimiento-espiritual/oracion/cosas-que-hacer-cuando-dios-guarda-silencio.html` (0.736) |
| ✓ | `cru-es-believer-evangelismo-trabajo` | Quiero hablarles de Jesús a mis compañeros de trabajo pero me da una vergüenza tremenda y no sé ni cómo sacar el tema. | 1 | 3/6 | `/mx/es/crecer-y-equipar/comparte-evangelio/estrategias-evangelismo/como-incorporar-tu-fe-al-trabajo.html` (0.708) |
| ✓ | `cru-es-believer-pecado-recurrente` | Caigo una y otra vez en el mismo pecado, me arrepiento y a los dos días vuelvo a lo mismo. ¿Cómo rompo ese círculo? | 5 | 1/1 | `/mx/es/crecer-y-equipar/vida-y-relaciones/men/recurring-sin.html` (0.650) |
| ✓ | `cru-es-newcomer-tiempo-diario` | Acabo de entregarle mi vida a Cristo. ¿Cómo hago para pasar un rato con Dios cada día sin que se me haga aburrido? | 1 | 2/2 | `/mx/es/crecer-y-equipar/crecimiento-espiritual/devocionales/a-daily-time-with-the-lord.html` (0.739) |
| ✓ | `cru-es-seeker-desanimo` | Llevo meses sin ganas de nada, me levanto y solo quiero volver a la cama. ¿A Dios le importa cómo me siento? | 3 | 3/3 | `/mx/es/crecer-y-equipar/crecimiento-espiritual/devocionales/advice-for-the-weary-at-heart.html` (0.627) |
| ✓ | `cru-es-seeker-vacio` | Tengo trabajo, pareja, todo lo que supuestamente debería hacerme feliz, y por dentro me siento vacío. ¿Qué me falta? | 2 | 4/4 | `/articulos/paz-mental.html` (0.645) |
| ✓ | `cru-es-skeptic-infierno` | Si Dios es tan bueno, ¿cómo se justifica que mande gente a quemarse para siempre? | 4 | 1/1 | `/articulos/malas.html` (0.639) |
| ✓ | `cru-es-skeptic-jesus-hombre` | No me trago que un tipo de hace dos mil años sea Dios. ¿Qué pruebas hay de que no fue solo un maestro más? | 1 | 6/8 | `/articulos/quienjesus.html` (0.680) |
| ✓ | `cru-newcomer-ordinary-testimony` | People at church give these dramatic testimonies and mine is just — I grew up believing, nothing happened to me. Why would anyone care about that? Is it even worth telling? | 1 | 1/2 | `/blog/what-if-you-dont-have-dramatic-christian-testimony` (0.693) |
| ✓ | `cru-seeker-ethnic-identity` | Church always feels like a white space where my background is something I'm supposed to leave at the door. Does following Jesus mean giving up where I come from? | 3 | 1/4 | `/devotionals/i-dont-belong-here` (0.653) |
| ✓ | `cru-skeptic-hell` | A loving God who tortures people forever just for believing the wrong thing? That's the part I can't get past. How do you defend that? | 2 | 2/2 | `/what-keeps-you-from-loving-god` (0.658) |
| ✓ | `es-seeker-loneliness` | Everyone around me seems to have people, and I just feel invisible and completely alone — does God even see me? | 1 | 6/11 | `/devotionals/no-longer-invisible` (0.726) |
| ✓ | `es-seeker-self-hatred` | I look in the mirror and hate the person staring back. Could God really love someone who can't stand themselves? | 1 | 6/13 | `/daily-devo/how-can-anyone-love-a-mess-like-this` (0.680) |
| ✓ | `es-seeker-fear-of-death` | I lie awake at night terrified of dying. What actually happens to us when we die? | 1 | 3/3 | `/have-you-heard-about-henry` (0.661) |
| ✓ | `es-newcomer-same-god` | Do all religions basically worship the same God, just in different ways? | 1 | 8/8 | `/features/religions-of-the-world.html` (0.642) |
| ✓ | `es-newcomer-astrology` | I check my horoscope every morning and I'm pretty into astrology — is there anything actually wrong with that? | 2 | 1/1 | `/faq/astrology.html` (0.583) |
| ✓ | `es-skeptic-scientists` | Name one serious scientist who actually believes in God. People who understand how the world works don't buy this stuff, right? | 1 | 3/3 | `/christianity-science-bogus-feud` (0.603) |
| ✓ | `es-seeker-muslim-background` | I grew up Muslim and lately I can't stop wondering about who Jesus really is. What do Christians claim about him that Islam doesn't? | 1 | 8/10 | `/us/en/train-and-grow/spiritual-growth/core-christian-beliefs/what-makes-christianity-different.html` (0.678) |
| ✓ | `es-newcomer-reincarnation` | Is reincarnation real? Do we keep coming back as someone else until we get it right? | 1 | 1/1 | `/forum/reincarnation.html` (0.599) |
| ✓ | `es-newcomer-denominations` | I'm brand new to all this and confused — Catholic, Baptist, Pentecostal... how am I supposed to know which church is the right one? | 1 | 3/3 | `/how-to-choose-a-church` (0.665) |
| ✓ | `es-skeptic-show-miracle` | If God wants people to believe in him, why doesn't he just do an obvious miracle on live TV and settle it? | 1 | 1/1 | `/forum/miracles2.html` (0.731) |
| ✓ | `esar-skeptic-tahrif` | أصدقائي يقولون إن الكتاب الذي بين أيدي المسيحيين اليوم غير الذي نزل من عند الله وأنه تبدّل عبر القرون. ما ردّكم على هذا؟ | 1 | 4/4 | `/a/jesusinislam.html` (0.744) |
| ✓ | `esar-seeker-trinity` | لا أستطيع أن أستوعب كيف يكون الله واحداً وثلاثة في الوقت نفسه. أليس هذا تناقضاً عقلياً؟ | 1 | 1/1 | `/a/trinity.html` (0.743) |
| ✓ | `esar-skeptic-child-suffering` | إذا كان الله رحيماً وقادراً على كل شيء، فلماذا يترك طفلاً بريئاً يُغتصب ولا يحرّك ساكناً؟ | 1 | 2/2 | `/a/childraped.html` (0.785) |
| ✓ | `esar-seeker-anxiety` | قلبي مشدود طوال الوقت وأفكاري لا تتوقف في الليل، وأشعر أن التوتر يأكلني. كيف أجد راحة؟ | 1 | 2/2 | `/a/tense2.html` (0.640) |
| ✓ | `esar-newcomer-who-is-jesus` | سمعت أن المسيحيين يعتبرون عيسى أكثر من مجرد نبي. على أي أساس يقولون هذا؟ | 1 | 3/4 | `/a/jesusinislam.html` (0.610) |
| ✓ | `esar-skeptic-evidence` | أنا لا أصدّق إلا ما أراه وألمسه. أعطني دليلاً علمياً واحداً على وجود خالق. | 1 | 4/4 | `/a/universe.html` (0.659) |
| ✓ | `esar-seeker-porn` | أدمنت مشاهدة المقاطع الإباحية ولا أستطيع التوقف، وكلما حاولت رجعت وأنا أشعر بالخزي. هل هناك مخرج؟ | 1 | 1/1 | `/a/toxic.html` (0.784) |
| ✓ | `esar-seeker-women-worth` | كامرأة في مجتمعنا الشرقي أشعر أن قيمتي أقل من الرجل. هل ينظر الدين إليّ نظرة مختلفة؟ | 1 | 1/1 | `/a/fem.html` (0.623) |
| ✓ | `esar-newcomer-after-death` | أفكر كثيراً في النهاية — هل هناك شيء بعد القبر أم أن كل شيء ينتهي هناك؟ | 1 | 1/1 | `/a/then.html` (0.681) |
| ✓ | `esar-seeker-emptiness` | عندي تقريباً كل ما تمنيته، ومع ذلك أحسّ بفراغ في داخلي لا أعرف كيف أملأه. ما الذي ينقصني؟ | 4 | 2/2 | `/a/wolves.html` (0.692) |
| ✓ | `esar-skeptic-which-god` | كل دين يدّعي أنه الطريق الصحيح. لماذا أختار إلهكم أنتم دون بقية الآلهة؟ | 1 | 4/4 | `/a/whypick.html` (0.602) |
| ✓ | `esar-believer-forgiveness` | شخص قريب جرحني جرحاً عميقاً، والجميع يقول لي سامح. كيف أسامح وأنا ما زلت أتألم؟ | 1 | 1/1 | `/a/forgiveness.html` (0.643) |
| ✓ | `esfr-newcomer-religions` | Toutes les religions ne mènent-elles pas au même Dieu, au fond ? | 1 | 4/5 | `/a/205divin.html` (0.670) |
| ✓ | `esfr-seeker-sens-vie` | Je me lève chaque matin sans savoir à quoi je sers — est-ce que ma vie a un sens ? | 1 | 3/4 | `/a/305but.html` (0.673) |
| ✓ | `esfr-seeker-peur-mort` | J'ai peur de mourir et je ne sais pas ce qu'il y a après — est-ce que quelqu'un peut me le dire ? | 1 | 4/4 | `/a/608apres.html` (0.743) |
| ✓ | `esfr-skeptic-enfer` | Un châtiment infini pour une vie finie, comment est-ce que ça peut être juste ? | 1 | 2/3 | `/10-questions-spirituelles-avec-reponses` (0.617) |
| ✓ | `esfr-newcomer-trinite` | On me dit qu'il y a un seul Dieu mais aussi le Père, le Fils et l'Esprit — comment ça marche ? | 1 | 2/2 | `/a/709trinite.html` (0.747) |
| ✓ | `esfr-seeker-apparence` | Je déteste mon reflet et je me compare sans arrêt aux autres — est-ce que je vaux quelque chose ? | 1 | 5/5 | `/a/509beaute.html` (0.617) |
| ✓ | `esfr-seeker-lgbt` | Je suis lesbienne et l'église m'a rejetée — est-ce que Dieu peut encore m'aimer ? | 1 | 2/2 | `/a/homosexuel-lesbienne.html` (0.770) |
| ✓ | `esfr-believer-priere-sans-reponse` | Je prie depuis des mois pour la même chose et rien ne bouge — est-ce que Dieu écoute ? | 1 | 2/3 | `/a/306lapriere.html` (0.754) |
| ✓ | `esfr-skeptic-islam-jesus` | Les musulmans disent que Jésus était un prophète, pas le Fils de Dieu — qui a raison ? | 1 | 5/5 | `/voir-dieu-face-a-face` (0.706) |
| ✓ | `esfr-newcomer-catholique` | Ma famille est catholique mais des amis me disent que je ne suis pas vraiment chrétien — qui a raison ? | 1 | 1/1 | `/a/723catholique.html` (0.767) |
| ✓ | `esfr-skeptic-racisme` | La religion a servi à justifier l'esclavage et à maintenir les femmes en bas — pourquoi lui faire confiance ? | 1 | 2/2 | `/a/MLK-et-le-racisme.html` (0.631) |
| ✓ | `esfr-seeker-mariage` | Avec tous les divorces autour de moi, est-ce que ça vaut encore le coup de se marier ? | 1 | 3/3 | `/a/502mariage.html` (0.747) |
| ✓ | `zhcn-skeptic-shenzai` | 我朋友都说信神只是自我安慰，根本没有依据。真的有什么站得住脚的理由吗？ | 1 | 5/6 | `/a/pack1.html` (0.670) |
| ✓ | `zhcn-newcomer-shenshi` | 神到底是什么样的？我脑子里只有一个模糊的力量，没有具体的样子。 | 1 | 3/3 | `/a/whois1.html` (0.578) |
| ✓ | `zhcn-skeptic-kunan` | 我一个朋友去年出事故走了，没有人能告诉我，一位良善的神为什么会容许这种事。 | 3 | 5/5 | `/content/Enigmas/BadThings605` (0.689) |
| ✓ | `zhcn-seeker-mubiao` | 每天结束的时候，我都觉得这一天什么也没留下。我到底为了什么活着？ | 5 | 1/3 | `/fear-of-death` (0.530) |
| ✓ | `zhcn-seeker-jiaolv` | 我几乎一直处在焦虑里。神对这种状态有什么可给的吗？ | 2 | 4/4 | `/content/lifeissues/facing-anxiety` (0.673) |
| ✓ | `zhcn-newcomer-yesusi` | 基督徒把耶稣的死看得很重，可我不明白祂的死到底成就了什么。 | 2 | 3/3 | `/good-friday` (0.615) |
| ✓ | `zhcn-skeptic-shengjing` | 圣经是几千年前写的，又一代代手抄下来。怎么能确定现在读到的还是原来的内容？ | 1 | 2/2 | `/a/jesusinislam.html` (0.662) |
| ✓ | `zhcn-believer-daogao` | 同一件事我祷告了很久，却一直没有任何回应。是我哪里做错了吗？ | 1 | 1/1 | `/a/prayers.html` (0.689) |
| ✓ | `zhcn-skeptic-zongjiao` | 每个人差不多都是跟着自己出生的环境信一个宗教。凭什么说其中一个比别的更真实？ | 2 | 4/5 | `/content/WhoIsHe/twokinds217` (0.540) |
| ✓ | `zhcn-newcomer-sanwei` | 基督徒说只有一位神，却又讲三个位格。这跟三个神有什么区别？ | 1 | 2/2 | `/a/trinity.html` (0.645) |
| ✓ | `esru-skeptic-dokazatelstva` | Все мои друзья считают, что вера в Бога — это просто самообман для слабых. Есть ли под этим хоть что-то серьёзное? | 3 | 3/3 | `/a/vibirat.html` (0.643) |
| ✓ | `esru-newcomer-kakoyon` | Мне говорят «Бог», а я представляю себе какую-то безликую энергию. А какой Он на самом деле? | 1 | 4/4 | `/a/vibirat.html` (0.610) |
| ✓ | `esru-skeptic-avariya` | У меня прошлым летом погиб друг — нелепая авария. И никто не может объяснить, почему добрый Бог такое допускает. | 1 | 5/5 | `/a/steysi2.html` (0.689) |
| ✓ | `esru-seeker-vpustuyu` | Каждый вечер ложусь с ощущением, что день прошёл впустую. И так уже который год. Ради чего всё это? | 1 | 4/4 | `/a/smisl.html` (0.637) |
| ✓ | `esru-seeker-trevoga` | Меня почти постоянно потряхивает от тревоги, даже когда объективно всё нормально. Может ли вера тут вообще чем-то помочь? | 2 | 3/3 | `/a/gdebog.html` (0.661) |
| ✓ | `esru-newcomer-krest` | Почему нельзя было просто простить людей? Зачем понадобилось, чтобы Иисус умер на кресте? | 8 | 1/2 | `/a/nastoy.html` (0.734) |
| ✓ | `esru-skeptic-perepisivali` | Библию переписывали от руки две тысячи лет. Откуда вообще известно, что там осталось хоть что-то от изначального текста? | 1 | 2/2 | `/a/bibliya.html` (0.680) |
| ✓ | `esru-believer-tishina` | Молюсь об одном и том же уже который месяц, а в ответ тишина. Я что-то делаю не так? | 1 | 1/1 | `/a/molitvi.html` (0.683) |
| ✓ | `esru-skeptic-odnoitozhe` | Христианство, ислам, буддизм — по-моему, все они говорят примерно одно и то же разными словами. В чём принципиальная разница? | 1 | 4/4 | `/a/soyed.html` (0.668) |
| ✓ | `esru-newcomer-troye` | В церкви молятся то Иисусу, то Отцу, то Духу. Я никак не пойму — это один и тот же или всё-таки разные? | 1 | 2/2 | `/a/troitsu.html` (0.737) |
| ✓ | `esbg-skeptic-izmislitsa` | Приятелите ми смятат, че вярата в Бог е измислица за хора, които не могат да се справят сами. Има ли нещо сериозно зад нея? | 1 | 3/3 | `/%D0%B2%D1%8A%D0%BF%D1%80%D0%BE%D1%81%D0%B8-%D0%B7%D0%B0-%D0%91%D0%BE%D0%B3/%D0%B7%D0%B0%D1%89%D0%BE-%D0%B5%D0%B4%D0%B8%D0%BD-%D1%80%D0%B0%D1%86%D0%B8%D0%BE%D0%BD%D0%B0%D0%BB%D0%B5%D0%BD-%D1%87%D0%BE%D0%B2%D0%B5%D0%BA-%D0%B2%D1%8F%D1%80%D0%B2%D0%B0-%D0%B2-%D0%91%D0%BE%D0%B3.html` (0.742) |
| ✓ | `esbg-newcomer-lichnost` | Когато чуя „Бог“, си представям някаква безлична сила някъде далеч. Той изобщо личност ли е? | 1 | 4/4 | `/%D0%B2%D1%8A%D0%BF%D1%80%D0%BE%D1%81%D0%B8-%D0%B7%D0%B0-%D0%91%D0%BE%D0%B3/%D1%82%D1%8A%D1%80%D1%81%D0%B5%D0%BD%D0%B5-%D0%BD%D0%B0-%D0%B8%D0%B4%D0%B5%D0%B0%D0%BB%D0%BD%D0%B8%D1%8F-%D0%91%D0%BE%D0%B3.html` (0.732) |
| ✓ | `esbg-skeptic-katastrofa` | Загубих приятел при катастрофа миналата година. Оттогава не мога да си отговоря как това се връзва с представата за любящ Бог. | 2 | 3/4 | `/%D0%B2%D1%8A%D0%BF%D1%80%D0%BE%D1%81%D0%B8-%D0%B7%D0%B0-%D0%B6%D0%B8%D0%B2%D0%BE%D1%82%D0%B0/%D1%81%D0%BF%D1%80%D0%B0%D0%B2%D1%8F%D0%BD%D0%B5-%D1%81-%D0%B1%D0%B5%D0%B7%D0%BF%D0%BE%D0%BA%D0%BE%D0%B9%D1%81%D1%82%D0%B2%D0%BE%D1%82%D0%BE.html` (0.707) |
| ✓ | `esbg-seeker-nishto-ne-ostava` | Всеки ден минава, а накрая усещам, че нищо не остава от него. За какво всъщност живея? | 1 | 5/5 | `/%D0%B2%D1%8A%D0%BF%D1%80%D0%BE%D1%81%D0%B8-%D0%B7%D0%B0-%D0%B6%D0%B8%D0%B2%D0%BE%D1%82%D0%B0/%D0%BF%D0%BE%D0%B2%D0%B5%D1%87%D0%B5-%D0%B2-%D1%82%D0%BE%D0%B7%D0%B8-%D0%B6%D0%B8%D0%B2%D0%BE%D1%82.html` (0.686) |
| ✓ | `esbg-seeker-trevoga` | Тревожа се почти постоянно, дори когато няма конкретна причина. Има ли вярата какво да предложи за това? | 1 | 2/2 | `/%D0%B2%D1%8A%D0%BF%D1%80%D0%BE%D1%81%D0%B8-%D0%B7%D0%B0-%D0%B6%D0%B8%D0%B2%D0%BE%D1%82%D0%B0/%D1%81%D0%BF%D1%80%D0%B0%D0%B2%D1%8F%D0%BD%D0%B5-%D1%81-%D0%B1%D0%B5%D0%B7%D0%BF%D0%BE%D0%BA%D0%BE%D0%B9%D1%81%D1%82%D0%B2%D0%BE%D1%82%D0%BE.html` (0.671) |
| ✓ | `esbg-newcomer-krast` | Не разбирам защо е трябвало някой да умира, за да ми бъдат простени греховете. Защо Бог просто не прости? | 3 | 1/1 | `/%D0%B2%D1%8A%D0%BF%D1%80%D0%BE%D1%81%D0%B8-%D0%B7%D0%B0-%D0%B6%D0%B8%D0%B2%D0%BE%D1%82%D0%B0/%D0%9F%D0%BE%D0%BC%D0%BE%D1%89-%D0%BE%D1%82-%D0%91%D0%BE%D0%B3-%D0%B2%D1%8A%D0%B2-%D0%B2%D1%81%D1%8F%D0%BA%D0%B0-%D1%81%D0%B8%D1%82%D1%83%D0%B0%D1%86%D0%B8%D1%8F.html` (0.746) |
| ✓ | `esbg-skeptic-prepisvana` | Библията е преписвана на ръка векове наред. Откъде да знам, че днешният текст е същият като първоначалния? | 2 | 2/2 | `/%D0%B4%D1%80%D1%83%D0%B3%D0%B8-%D0%B2%D1%8A%D0%BF%D1%80%D0%BE%D1%81%D0%B8/%D0%98%D1%81%D1%83%D1%81-%D0%B8-%D0%B8%D1%81%D0%BB%D1%8F%D0%BC%D1%8A%D1%82.html` (0.750) |
| ✓ | `esbg-believer-bez-otgovor` | Моля се за едно и също нещо от месеци, а отговор няма. Греша ли в нещо? | 1 | 1/1 | `/%D0%B4%D0%B0-%D0%BF%D0%BE%D0%B7%D0%BD%D0%B0%D0%B2%D0%B0%D0%BC%D0%B5-%D0%91%D0%BE%D0%B3/%D0%BE%D1%82%D0%B3%D0%BE%D0%B2%D0%B0%D1%80%D1%8F-%D0%BB%D0%B8-%D0%91%D0%BE%D0%B3-%D0%BD%D0%B0-%D0%BC%D0%BE%D0%BB%D0%B8%D1%82%D0%B2%D0%B8%D1%82%D0%B5-%D0%BD%D0%B8.html` (0.691) |
| ✓ | `esbg-skeptic-edno-i-sashto` | Християнство, ислям, будизъм — струва ми се, че всички твърдят едно и също с различни думи. Къде е реалната разлика? | 1 | 1/1 | `/%D0%B4%D0%B0-%D0%BF%D0%BE%D0%B7%D0%BD%D0%B0%D0%B2%D0%B0%D0%BC%D0%B5-%D0%91%D0%BE%D0%B3/%D1%81%D0%B2%D1%8A%D1%80%D0%B7%D0%B2%D0%B0%D0%BD%D0%B5-%D1%81-%D0%91%D0%BE%D0%B6%D0%B5%D1%81%D1%82%D0%B2%D0%B5%D0%BD%D0%BE%D1%82%D0%BE.html` (0.734) |
| ✓ | `esbg-newcomer-trima` | На службата се обръщат ту към Исус, ту към Отца, ту към Светия Дух. Значи ли това, че християните почитат повече от един Бог? | 1 | 2/2 | `/%D0%B4%D0%B0-%D0%BF%D0%BE%D0%B7%D0%BD%D0%B0%D0%B2%D0%B0%D0%BC%D0%B5-%D0%91%D0%BE%D0%B3/%D0%BC%D0%BE%D0%B6%D0%B5%D1%82%D0%B5-%D0%BB%D0%B8-%D0%B4%D0%B0-%D0%BE%D0%B1%D1%8F%D1%81%D0%BD%D0%B8%D1%82%D0%B5-%D0%A2%D1%80%D0%BE%D0%B8%D1%86%D0%B0%D1%82%D0%B0.html` (0.705) |
| ✓ | `essk-skeptic-podklad` | Kamaráti berú vieru v Boha ako niečo, čo si človek nahovorí, keď mu je ťažko. Má tá viera vôbec nejaký rozumný podklad? | 1 | 4/4 | `/pribeh-ateistky` (0.729) |
| ✓ | `essk-newcomer-neosobna-sila` | Keď sa povie Boh, predstavím si nejakú neosobnú energiu kdesi vo vesmíre. Dá sa o ňom povedať niečo konkrétnejšie? | 1 | 5/5 | `/vznik-vesmiru-4` (0.659) |
| ✓ | `essk-skeptic-nehoda` | Kamarát mi vlani zomrel pri nehode. Odvtedy neviem pochopiť, prečo sa na to Boh len tak prizeral, keď má byť dobrý. | 1 | 5/5 | `/preco-je-zivot-taky-tazky` (0.718) |
| ✓ | `essk-seeker-nic-z-toho` | Každý večer mám pocit, že celý deň zase nikam neviedol. Načo to všetko vlastne je? | 1 | 5/5 | `/viktor` (0.612) |
| ✓ | `essk-seeker-napatie` | Napätie v sebe nosím skoro stále, aj keď sa nič konkrétne nedeje. Vie s tým viera niečo urobiť? | 1 | 3/3 | `/ako-najst-vnutorny-pokoj` (0.681) |
| ✓ | `essk-newcomer-kriz` | Prečo musel niekto zomrieť na to, aby mi Boh mohol odpustiť? Nemohol jednoducho odpustiť? | 1 | 2/2 | `/preco-a-ako-zomrel-jezis` (0.736) |
| ✓ | `essk-skeptic-prepisovanie` | Neviem, ako mám brať vážne knihu, ktorá vznikla pred tisíckami rokov a odvtedy prešla neviem koľkými rukami. | 1 | 2/2 | `/je-biblia-pravdiva` (0.662) |
| ✓ | `essk-believer-ticho` | Za jednu vec sa modlím už mesiace a stále ticho. Je chyba vo mne? | 1 | 1/1 | `/ako-sa-modlit` (0.731) |
| ✓ | `essk-skeptic-rovnake` | Vyrastal som v tom, že každý si má nájsť svoju vlastnú cestu k Bohu a že sú v podstate rovnocenné. Prečo by mala byť práve tá kresťanská výnimočná? | 1 | 4/4 | `/astrologia-a-hladanie-boha` (0.682) |
| ✓ | `essk-newcomer-traja` | Kamarátka sa modlí k Ježišovi, ale hovorí o ňom aj ako o Božom Synovi a ešte spomína Ducha Svätého. Nechápem, kto je teda kto. | 1 | 1/2 | `/co-je-svata-trojica` (0.699) |
| ✓ | `eshu-skeptic-vagyalom` | A barátaim szerint az istenhit csak vágyálom. Van bármi tényleges, ami alátámasztja, vagy tényleg csak érzés az egész? | 1 | 4/5 | `/a/ateista.html` (0.744) |
| ✓ | `eshu-newcomer-milyen` | Ha valaki azt mondja, hogy „Isten”, nekem valami ködös energia jut eszembe valahol fent. Ő egyáltalán személy? | 1 | 3/3 | `/a/tokeletes.html` (0.711) |
| ✓ | `eshu-skeptic-baleset` | Tavaly meghalt egy barátom egy balesetben. Azóta sem tudom összerakni magamban, hogy ez hogyan fér össze egy jóságos Istennel. | 1 | 4/4 | `/a/miert.html` (0.726) |
| ✓ | `eshu-seeker-uresen` | Minden napom ugyanúgy telik, és este azzal fekszem le, hogy semmi nem maradt belőle. Mi értelme az egésznek? | 1 | 4/4 | `/a/celom.html` (0.660) |
| ✓ | `eshu-seeker-szorongas` | Szinte állandóan szorongok, akkor is, amikor épp semmi konkrét bajom nincs. Kínál erre a hit bármit is? | 1 | 3/3 | `/a/koronavirus.html` (0.677) |
| ✓ | `eshu-newcomer-kereszt` | A keresztény ismerőseim úgy beszélnek a keresztről, mintha az mindent megváltoztatott volna. Nekem viszont csak egy kivégzés, ami kétezer éve történt. | 5 | 1/1 | `/a/forrasa.html` (0.709) |
| ✓ | `eshu-skeptic-masolat` | Hittanórán azt mondták, a Biblia Istentől van, de nekem attól még egy könyv, amit emberek írtak és emberek másoltak évszázadokon át. Mitől lenne ez más, mint bármelyik régi irat? | 1 | 2/2 | `/a/biblianak.html` (0.709) |
| ✓ | `eshu-believer-csend` | Hónapok óta ugyanazért imádkozom, és csak csend a válasz. Rosszul csinálok valamit? | 1 | 1/1 | `/a/imadsagra.html` (0.713) |
| ✓ | `eshu-skeptic-ugyanaz` | A kollégáim között van muszlim és buddhista is, és mindegyik ugyanolyan meggyőződéssel beszél a saját hitéről, mint a keresztény ismerőseim. Miért lenne bármelyiküknek jobban igaza? | 1 | 2/2 | `/a/istenkereses.html` (0.735) |
| ✓ | `eshu-newcomer-harman` | A templomban hol Jézushoz, hol az Atyához, hol a Szentlélekhez szólnak. Akkor a keresztények most több istent imádnak? | 1 | 2/2 | `/a/szentharomsagot.html` (0.708) |
| ✓ | `esmn-skeptic-notolgoo` | Найзууд маань Бурхан гэдэг зүгээр л хүний зохиосон зүйл гэж ярьдаг. Түүнийг үнэхээр байдаг гэж үзэх ямар нэг бодит үндэслэл, нотолгоо байдаг юм уу? | 3 | 3/4 | `/a/213Zaan.html` (0.704) |
| ✓ | `esmn-newcomer-yamarhuu` | «Бурхан» гэхээр надад ямар нэгэн бүрхэг хүч л төсөөлөгддөг болохоос өөр юу ч ойлгогддоггүй. Тэр яг ямархуу нэгэн юм бэ? | 1 | 4/4 | `/a/109Yertontsiyn.html` (0.715) |
| ✓ | `esmn-skeptic-osol` | Өнгөрсөн жил найз маань осолд орж нас барсан. Сайн Бурхан байдаг юм бол яагаад үүнийг зөвшөөрсөн юм бэ гэдгийг надад хэн ч тайлбарлаж чадахгүй байна. | 4 | 4/6 | `/a/607Naydvar.html` (0.726) |
| ✓ | `esmn-seeker-zorilgo` | Өдөр бүр адилхан өнгөрч, эцэст нь юунд ч хүрэхгүй юм шиг санагддаг. Хүн ер нь юуны тулд амьдардаг юм бэ? Надад ямар нэг зорилго байх учиртай юу? | 1 | 3/3 | `/a/303Zhinhene.html` (0.677) |
| ✓ | `esmn-seeker-tvgshvvr` | Онцгой болсон юм байхгүй атал би бараг байнга дотроо түгшиж, сандарч байдаг. Үүнд итгэл ямар нэгэн байдлаар тус болох уу? | 2 | 2/2 | `/a/306Ezen.html` (0.685) |
| ✓ | `esmn-newcomer-zagalmai` | Христэд итгэгчид Есүсийн үхлийг маш чухалчилдаг нь ойлгомжтой. Гэхдээ Түүний үхэл яг юуг өөрчилсөн юм бэ гэдэг нь надад ойлгогдохгүй байна. | 3 | 1/2 | `/a/201Moohar.html` (0.703) |
| ✓ | `esmn-skeptic-bibli` | Библийг мянга мянган жилийн өмнө бичээд, гараар хуулж ирсэн гэдэг. Тэгээд одоо байгаа зүйл нь анхных нь хэвээрээ гэдгийг хэн яаж мэдэх юм бэ? | 1 | 2/2 | `/a/722Bibliyn.html` (0.683) |
| ✓ | `esmn-believer-chimeegvi` | Би нэг л зүйлийн төлөө хэдэн сар залбирсаар байна, гэтэл ямар ч хариу алга. Би ямар нэг зүйлийг буруу хийж байна уу? | 1 | 1/1 | `/a/306Ezen.html` (0.535) |
| ✓ | `esmn-skeptic-ijil` | Буддизм, Лал, Христ шашин — надад бүгд өөр өөр үгээр нэг л зүйлийг ярьж байгаа юм шиг санагддаг. Үндсэн ялгаа нь юу вэ? | 1 | 3/4 | `/a/200kholbogdokh.html` (0.738) |
| ✓ | `esmn-newcomer-gurav` | Сүмд нэг удаа очиход Эцэг, Хүү, Ариун Сүнс гэж тус тусад нь нэрлээд байсан. Тэгэхээр Христэд итгэгчид нэгээс олон бурхныг шүтдэг юм уу? | 1 | 2/2 | `/a/709Goorval.html` (0.709) |
| ✓ | `esja-skeptic-negaibou` | 友人に「神を信じるなんて現実逃避でしょ」と笑われました。うまく言い返せなかったのですが、信じることに理屈はあるんでしょうか。 | 1 | 2/2 | `/a/atheist.html` (0.661) |
| ✓ | `esja-newcomer-jinkaku` | 「神様」と聞いても、ぼんやりした大きな力みたいなものしか思い浮かびません。聖書の神には、性格とか人格みたいなものがあるんでしょうか。 | 1 | 3/3 | `/a/ideal.html` (0.741) |
| ✓ | `esja-skeptic-jiko` | 去年、友人を事故で亡くしました。周りは「仕方ない」と言いますが、愛のある神がいるならなぜ止めてくれなかったのか、ずっと引っかかっています。 | 1 | 4/5 | `/a/eni3.html` (0.689) |
| ✓ | `esja-seeker-karappo` | 毎日ちゃんと働いて家に帰るのに、寝る前になると今日は何だったんだろうと空っぽになります。何のために生きているんでしょうか。 | 1 | 4/4 | `/a/purpose.html` (0.554) |
| ✓ | `esja-seeker-fuan` | 特に何かあったわけでもないのに、いつも胸のあたりがざわざわして落ち着きません。信仰みたいなもので、こういうのは楽になりますか。 | 1 | 2/2 | `/a/coronavirus.html` (0.558) |
| ✓ | `esja-newcomer-juujika` | キリスト教では十字架が大事だと聞きますが、二千年前に処刑された人の死が、今の自分と何の関係があるのか分かりません。 | 3 | 1/1 | `/a/jesus-in-islam.html` (0.692) |
| ✓ | `esja-skeptic-kakikae` | 聖書は何千年も手書きで写されてきたんですよね。途中で都合よく書き換えられていない保証って、どこにあるんですか。 | 1 | 2/2 | `/a/jesus-in-islam.html` (0.615) |
| ✓ | `esja-believer-henji` | 同じことをもう何ヶ月も祈っているのに、何の返事もありません。祈り方が間違っているんでしょうか。 | 1 | 1/1 | `/a/exp6.html` (0.686) |
| ✓ | `esja-skeptic-onaji` | うちは祖父母が仏教で、正月は神社にも行きます。宗教なんて結局どれも同じだと思うのですが、キリスト教だけ違うと言えるんですか。 | 1 | 3/3 | `/a/jes205.html` (0.653) |
| ✓ | `esja-newcomer-sannin` | 教会で父と子と聖霊という言い方を聞きました。神様は一人だと教わったのに、これだと三人いることになりませんか。 | 1 | 2/2 | `/a/trinity.html` (0.721) |
| ✓ | `espl-skeptic-mysleniezyczeniowe` | Znajomi powtarzają, że Bóg to wymysł i ludzie wierzą w niego tylko dlatego, że chcą, żeby był prawdziwy. Czy jest jakikolwiek konkretny powód, żeby sądzić inaczej? | 1 | 4/4 | `/a/istnienieboga.html` (0.713) |
| ✓ | `espl-newcomer-jakion` | Kiedy ktoś mówi „Bóg”, w mojej głowie pojawia się jakaś bezosobowa energia gdzieś w kosmosie. Czy chrześcijanie mają o Nim coś konkretniejszego do powiedzenia? | 1 | 4/4 | `/a/bogbiblii.html` (0.648) |
| ✓ | `espl-skeptic-wypadek` | W zeszłym roku zginął w wypadku mój przyjaciel. Do dziś nie potrafię tego poskładać z tym, że Bóg miałby być dobry. | 1 | 5/5 | `/a/dlaczego.html` (0.683) |
| ✓ | `espl-seeker-nicniezostaje` | Kończę dzień i mam wrażenie, że nic z niego nie zostało. I tak od kilku lat. Po co to wszystko? | 1 | 4/4 | `/a/celzycia.html` (0.661) |
| ✓ | `espl-seeker-lek` | Prawie cały czas siedzi we mnie niepokój, nawet kiedy obiektywnie nic złego się nie dzieje. Czy wiara ma na to jakąkolwiek odpowiedź? | 1 | 2/2 | `/a/pokoj.html` (0.707) |
| ✓ | `espl-newcomer-krzyz` | Nie rozumiem, dlaczego ktoś musiał umrzeć, żebym dostał przebaczenie. Bóg nie mógł po prostu odpuścić? | 1 | 2/2 | `/a/dlaczego-umarl.html` (0.743) |
| ✓ | `espl-skeptic-przepisywana` | Biblię przepisywano ręcznie przez setki lat. Skąd mam wiedzieć, że to, co dziś czytam, to nadal ten sam tekst? | 1 | 1/1 | `/a/jezusislam.html` (0.705) |
| ✓ | `espl-believer-cisza` | Od pół roku modlę się o jedną i tę samą sprawę i kompletnie nic z tego nie wynika. Zaczynam się zastanawiać, czy ktokolwiek tego słucha. | 1 | 1/1 | `/a/modlitwy.html` (0.706) |
| ✓ | `espl-skeptic-kazdyswoje` | W mojej grupie każdy wierzy w co innego — jeden w Allaha, ktoś w karmę, ja w nic. Czy chrześcijaństwo naprawdę mówi coś innego niż reszta? | 1 | 3/3 | `/a/szukanieboga.html` (0.666) |
| ✓ | `espl-newcomer-trzech` | Kolega mówi, że chrześcijanie modlą się do Jezusa, do jego Ojca i jeszcze do jakiegoś Ducha. Dla mnie z zewnątrz wygląda to na trzy różne postacie. | 1 | 2/2 | `/a/trojca.html` (0.700) |
| ✓ | `essq-skeptic-shpikje` | Ateistët thonë se Perëndinë e kemi shpikur ne, jo ai ne. Unë s'di ç't'u them — a ka gjë të prekshme nga ana tjetër? | 1 | 3/3 | `/a/ekziston.html` (0.749) |
| ✓ | `essq-newcomer-si-eshte` | Nuk jam rritur në kishë. Kur dëgjoj «Perëndi» më vjen ndërmend diçka e madhe dhe e ftohtë, pa lidhje me mua. A është vërtet i tillë? | 2 | 2/3 | `/a/mendjes.html` (0.710) |
| ✓ | `essq-skeptic-aksident` | Vitin e kaluar një shok imi vdiq në aksident, 22 vjeç. Prindërit e tij janë besimtarë dhe unë nuk e kuptoj si mund të vazhdojnë ta quajnë Perëndinë të mirë. | 3 | 3/4 | `/a/koronavirus.html` (0.727) |
| ✓ | `essq-seeker-pa-mbetur` | E mbyll ditën me ndjesinë që nuk mbeti asgjë prej saj. Për çfarë po e jetoj gjithë këtë? | 2 | 2/3 | `/a/mendjes.html` (0.635) |
| ✓ | `essq-seeker-ankth` | Jam gati gjithë kohës në ankth, edhe kur s'ka ndonjë arsye konkrete. A ka feja diçka për të ofruar këtu? | 1 | 2/2 | `/a/koronavirus.html` (0.722) |
| ✓ | `essq-newcomer-kryqi` | Të krishterët e vënë kryqin në qendër të gjithçkaje. Unë s'e kuptoj çfarë ndryshoi konkretisht vdekja e një njeriu para dy mijë vjetësh. | 2 | 2/2 | `/a/islamizmi.html` (0.694) |
| ✓ | `essq-skeptic-kopjuesit` | Nga Bibla e parë deri te ajo që kam unë në duar kanë kaluar mijëra vjet dhe qindra kopjues. Ç'garanci ka që nuk është ndryshuar rrugës? | 1 | 2/2 | `/a/biblen.html` (0.732) |
| ✓ | `essq-believer-heshtje` | Ka një gjë për të cilën lutem prej kohësh dhe asgjë nuk lëviz. Fillova të pyes veten nëse Perëndia po më dëgjon fare. | 2 | 1/1 | `/a/ateiste.html` (0.727) |
| ✓ | `essq-skeptic-njesoj` | Në qytetin tim ka xhami dhe kisha në të njëjtën rrugë dhe secili thotë se është në rrugën e duhur. Përse duhet ta veçoj Jezusin nga të gjitha të tjerat? | 2 | 4/4 | `/a/vertetash.html` (0.733) |
| ✓ | `essq-newcomer-tre-veta` | Një shoqe më ftoi në kishë dhe lutjet ia drejtonin herë Jezusit, herë Atit, herë Frymës. S'kuptova nëse bëhej fjalë për të njëjtin apo për të ndryshëm. | 2 | 2/2 | `/a/lutjeve.html` (0.670) |
| ✓ | `estr-skeptic-kanit` | Arkadaşlarımın hepsi Tanrı'ya inanmayı bir temenniden ibaret görüyor. Elle tutulur bir dayanağı var mı bunun? | 1 | 4/4 | `/makaleler/varmi.html` (0.705) |
| ✓ | `estr-newcomer-nasilbiri` | Tanrı deyince aklıma uzaklarda duran belirsiz bir güç geliyor. Aslında nasıl biri? | 1 | 3/3 | `/makaleler/idealtanri.html` (0.656) |
| ✓ | `estr-skeptic-kaza` | Geçen yıl bir arkadaşımı kazada kaybettim. O günden beri bunun iyi bir Tanrı fikriyle nasıl bağdaştığını çözemiyorum. | 2 | 3/3 | `/makaleler/umut2.html` (0.614) |
| ✓ | `estr-seeker-bosluk` | Her günün sonunda geriye hiçbir şey kalmamış gibi hissediyorum. Yıllardır böyle. Bütün bunlar ne için? | 1 | 4/5 | `/makaleler/yasaminanlami.html` (0.632) |
| ✓ | `estr-seeker-kaygi` | Ortada somut bir sebep yokken bile içimde sürekli bir tedirginlik var. İman bu konuda gerçekten bir şey sunuyor mu? | 3 | 2/3 | `/makaleler/rehber.html` (0.667) |
| ✓ | `estr-newcomer-carmih` | Hristiyanlar İsa'nın çarmıhta ölmesine çok büyük bir anlam yüklüyor ama bu ölümün tam olarak neyi değiştirdiğini anlayamıyorum. | 2 | 1/1 | `/makaleler/muslumanlik.html` (0.701) |
| ✓ | `estr-skeptic-degistirildi` | Kutsal Kitap yüzyıllar boyunca elle çoğaltılmış. Bugün elimizdekinin aslıyla aynı olduğunu nereden bilebilirim? | 1 | 2/2 | `/makaleler/muslumanlik.html` (0.717) |
| ✓ | `estr-believer-sessizlik` | Aylardır aynı şey için dua ediyorum ama karşılığında hiçbir şey yok. Yanlış bir şey mi yapıyorum? | 1 | 1/1 | `/makaleler/dualar.html` (0.684) |
| ✓ | `estr-skeptic-aynisey` | Bana kalırsa bütün dinler farklı kelimelerle aynı şeyi söylüyor. Aradaki asıl fark nerede? | 1 | 2/2 | `/makaleler/neden-farklidir.html` (0.646) |
| ✓ | `estr-newcomer-uckisi` | Kilisede kimi zaman İsa'ya, kimi zaman Baba'ya sesleniliyor, bir de Kutsal Ruh var. Hristiyanlar birden fazla Tanrı'ya mı tapıyor yani? | 1 | 2/2 | `/makaleler/uclubirlik.html` (0.740) |
| ✓ | `espt-skeptic-consolo` | Meus amigos acham que crer em Deus é só imaginação. Existe alguma coisa sólida por trás disso, do lado da ciência ou da razão, ou é só o que a pessoa sente? | 1 | 5/6 | `/a/ateia.html` (0.692) |
| ✓ | `espt-newcomer-energia` | Quando as pessoas falam de Deus, a imagem que me vem é uma energia vaga em algum lugar. Ele é alguém de verdade, com personalidade, ou é só uma força? | 1 | 3/3 | `/a/deusdabiblia.html` (0.677) |
| ✓ | `espt-skeptic-acidente` | No ano passado um amigo meu morreu num acidente idiota. Até hoje ninguém consegue me explicar como um Deus bom deixa uma coisa dessas acontecer. | 1 | 3/3 | `/a/coisasruins.html` (0.695) |
| ✓ | `espt-seeker-vazio` | Todo dia é igual e à noite eu deito com a sensação de que nada daquilo serviu pra nada. Pra que eu estou aqui, afinal? | 1 | 4/4 | `/a/proposito.html` (0.628) |
| ✓ | `espt-seeker-ansiedade` | Vivo com uma ansiedade que quase não passa, mesmo quando não tem nada de concreto errado. A fé oferece alguma coisa pra isso? | 1 | 3/3 | `/a/coronavirus.html` (0.707) |
| ✓ | `espt-newcomer-cruz` | Meus amigos cristãos falam da cruz como se aquilo tivesse mudado tudo. Pra mim é só uma execução que aconteceu há dois mil anos. | 1 | 1/1 | `/a/morreu.html` (0.646) |
| ✓ | `espt-skeptic-copiado` | Na escola me ensinaram que a Bíblia é palavra de Deus, mas pra mim continua sendo um livro que gente escreveu e gente copiou durante séculos. O que faria dela algo diferente de qualquer outro texto antigo? | 1 | 2/2 | `/a/biblia.html` (0.736) |
| ✓ | `espt-believer-silencio` | Faz meses que eu oro pela mesma coisa e não vem resposta nenhuma. Será que eu estou fazendo alguma coisa errada? | 1 | 1/1 | `/a/oracoes.html` (0.700) |
| ✓ | `espt-skeptic-conviccao` | No meu trabalho tem gente de tudo quanto é religião, e cada um fala da sua com a mesma convicção. Por que justamente o cristianismo estaria mais certo que os outros? | 2 | 3/3 | `/a/segredo.html` (0.667) |
| ✓ | `espt-newcomer-tres` | Na igreja rezam ora pra Jesus, ora pro Pai, ora pro Espírito Santo. Então os cristãos adoram mais de um Deus? | 1 | 2/2 | `/a/trindade.html` (0.683) |
| ✓ | `eses-skeptic-ilusion` | Mis amigos dicen que creer en Dios es una ilusión que uno se inventa para sentirse mejor. ¿Hay algún dato comprobable a favor, o al final es solo lo que cada quien quiera creer? | 1 | 5/6 | `/articulos/atea.html` (0.647) |
| ✓ | `eses-newcomer-comodios` | Cuando alguien me habla de Dios, en mi cabeza aparece una especie de energía enorme y lejana. ¿Es alguien con quien de verdad se pueda tener trato? | 1 | 4/5 | `/articulos/Dios.html` (0.595) |
| ✓ | `eses-skeptic-accidente` | El año pasado murió un amigo mío en un accidente y nadie ha sabido explicarme cómo encaja eso con un Dios bueno. | 1 | 5/5 | `/articulos/malas.html` (0.674) |
| ✓ | `eses-seeker-rutina` | Estudias, consigues trabajo, te casas, pagas la casa, te jubilas y se acabó. Cuando lo veo así de seguido me pregunto para qué es todo esto. | 1 | 3/3 | `/articulos/ahoraque.html` (0.581) |
| ✓ | `eses-seeker-ansiedad` | Llevo años intentando calmar la ansiedad con meditación, ejercicios de respiración y libros de autoayuda, y siempre vuelve. ¿Dios ofrece algo distinto de todo eso? | 1 | 3/3 | `/articulos/coronavirus.html` (0.668) |
| ✓ | `eses-newcomer-cruz` | Los cristianos que conozco hablan de la cruz como si hubiera cambiado todo. Para mí fue una ejecución más de hace dos mil años. ¿Qué se supone que consiguió? | 1 | 3/3 | `/articulos/murio.html` (0.596) |
| ✓ | `eses-skeptic-copias` | A mí me dijeron que la Biblia es palabra de Dios, pero para mí sigue siendo un libro que escribieron y copiaron personas durante siglos. ¿Qué la hace distinta de cualquier otro texto antiguo? | 1 | 2/2 | `/articulos/biblia.html` (0.717) |
| ✓ | `eses-believer-merezco` | Cada vez que me pongo a orar me acuerdo de todo lo que hice mal esa semana y siento que no tengo cara para pedirle nada a Dios. ¿A alguien así lo escucha igual? | 3 | 1/1 | `/mx/es/crecer-y-equipar/crecimiento-espiritual/oracion/razones-por-las-cuales-oramos.html` (0.674) |
| ✓ | `eses-skeptic-mismolugar` | Tengo compañeros musulmanes, budistas e hindúes y todos hablan de su fe con la misma convicción. ¿Por qué el cristianismo sería algo distinto y no una versión más de lo mismo? | 2 | 3/3 | `/mx/es/crecer-y-equipar/crecimiento-espiritual/core-christian-beliefs/what-makes-christianity-different.html` (0.693) |
| ✓ | `eses-newcomer-tresdioses` | Fui al bautizo de mi sobrina y dijeron «en el nombre del Padre, del Hijo y del Espíritu Santo». Yo tenía entendido que los cristianos creen en un solo Dios y me quedé sin entender nada. | 2 | 2/2 | `/mx/es/crecer-y-equipar/crecimiento-espiritual/core-christian-beliefs/understanding-the-trinity.html` (0.747) |
| ✓ | `esfa-skeptic-khiyalbafi` | دوستانم همه میگویند ایمان به خدا فقط یک خیالبافی است. آیا در خود طبیعت و در یافتههای علمی چیزی هست که واقعاً به وجود یک خالق اشاره کند؟ | 2 | 5/5 | `/a/science.html` (0.681) |
| ✓ | `esfa-newcomer-niroo` | وقتی کسی از «خدا» حرف میزند، تنها چیزی که در ذهن من میآید یک نیروی مبهم است جایی بالای سر ما. اصلاً او یک شخص است؟ | 1 | 4/4 | `/a/whypick.html` (0.655) |
| ✓ | `esfa-skeptic-tasadof` | پارسال یکی از دوستانم در یک تصادف کشته شد. تا امروز هیچکس نتوانسته برایم توضیح دهد که این چطور با وجود خدایی مهربان جور درمیآید. | 1 | 4/4 | `/a/why.html` (0.639) |
| ✓ | `esfa-seeker-pooch` | هر شب که سرم را روی بالش میگذارم حس میکنم از تمام آن روز چیزی باقی نمانده. اصلاً من برای چه ساخته شدهام؟ | 1 | 3/3 | `/a/greatest.html` (0.588) |
| ✓ | `esfa-seeker-delshoore` | تقریباً همیشه یک دلشوره در دلم هست، حتی وقتی هیچ اتفاق بدی نیفتاده. ایمان برای این حال چیزی دارد؟ | 3 | 2/2 | `/a/prayers.html` (0.613) |
| ✓ | `esfa-newcomer-salib` | مسیحیها میگویند مرگ عیسی روی صلیب مهمترین اتفاق تاریخ بوده است. من نمیفهمم مرگ او قرار بود چه مشکلی را حل کند. | 1 | 1/1 | `/a/whydid.html` (0.709) |
| ✓ | `esfa-skeptic-tahrif` | به من گفتهاند کتاب مسیحیان در طول قرنها دست به دست و نسخهبرداری شده و دیگر آن چیزی نیست که در ابتدا بوده. از کجا میشود مطمئن شد نسخهای که امروز میخوانند همان است؟ | 1 | 2/2 | `/a/bible.html` (0.706) |
| ✓ | `esfa-believer-sokoot` | ماههاست برای یک چیز مشخص دعا میکنم و هیچ جوابی نمیگیرم. دارم کاری را اشتباه انجام میدهم؟ | 1 | 1/1 | `/a/prayers.html` (0.697) |
| ✓ | `esfa-skeptic-hamkaran` | دوستان من مسلمان، بودایی و هندو هستند و هر کدام مطمئنند خدا را همانطور که هست میشناسند. چرا باید ادعای عیسی از بقیه جدا باشد؟ | 1 | 2/3 | `/a/religions.html` (0.687) |
| ✓ | `esfa-newcomer-seta` | شنیدهام مسیحیها میگویند خدا یکی است، ولی بعد هم از پدر حرف میزنند، هم از پسر و هم از روح. پس بالاخره چند تا خدا دارند؟ | 1 | 2/2 | `/a/trinity.html` (0.690) |
| ✓ | `escs-skeptic-zbozne-prani` | Kamarádi mi pořád opakují, že víra v Boha je jenom zbožné přání — něco, co si člověk namluví, aby se mu líp usínalo. Existují pro to nějaká fakta, nebo je to opravdu jenom pocit? | 1 | 4/5 | `/in/114/jak_ateistka_nasla_boha` (0.699) |
| ✓ | `escs-newcomer-mlhava-sila` | Když někdo řekne „Bůh“, mně naskočí jenom jakási mlhavá energie někde nahoře. Nemám o něm žádnou představu, které bych se mohl chytit. Dá se o něm vůbec vědět něco konkrétního? | 1 | 4/4 | `/in/146/proc_zrovna_buh_bible_` (0.684) |
| ✓ | `escs-skeptic-nehoda` | Loni mi při nehodě zemřel kamarád. Doteď si nedokážu srovnat, jak tohle jde dohromady s Bohem, o kterém se říká, že je dobrý. | 1 | 5/5 | `/in/36/proc_je_zivot_tak_tezky` (0.724) |
| ✓ | `escs-seeker-nic-nezbylo` | Každý den mi uteče úplně stejně a večer si lehnu s pocitem, že z něj vlastně nic nezbylo. K čemu to celé je? | 1 | 3/3 | `/in/34/_jaky_ma_muj_zivot_smysl_` (0.566) |
| ✓ | `escs-seeker-uzkost` | Nic hrozného se mi neděje, a stejně jsem skoro pořád sevřený a ve střehu — stačí zkouška nebo hádka doma a jsem úplně mimo. Dá se v takovém stavu vůbec někde vzít vnitřní klid? | 1 | 1/1 | `/in/25/jak_muzu_najit_vnitrni_klid` (0.741) |
| ✓ | `escs-newcomer-kriz` | Křesťani kolem mě mluví o kříži, jako by tím bylo najednou všechno vyřešené. Pro mě je to jenom poprava před dvěma tisíci lety — co se tím jako mělo vyřídit? | 1 | 2/2 | `/in/66/proc_vubec_jezis_zemrel` (0.643) |
| ✓ | `escs-skeptic-prepisovali` | Ve škole nám tvrdili, že Bible je od Boha, jenže pro mě je to pořád jenom kniha, kterou psali a po staletí přepisovali lidi. Čím se má lišit od jakéhokoli jiného starého spisu? | 1 | 3/3 | `/in/67/proc_bychom_meli_verit_bibli` (0.704) |
| ✓ | `escs-believer-ticho` | Za jednu a tutéž věc se modlím už řadu měsíců a pořád nic — žádná odpověď, žádná změna. Dělám něco špatně, nebo to takhle prostě chodí? | 1 | 2/2 | `/in/61/odpovida_buh_na_nase_modlitby` (0.696) |
| ✓ | `escs-skeptic-stejne-presvedceni` | Mezi spolužáky mám muslima i kluka, co jezdí na meditace, a oba mluví o své víře stejně přesvědčeně jako křesťani, které znám. Proč by měl mít pravdu zrovna jeden z nich? | 1 | 5/5 | `/in/71/vedou_vsechna_nabozenstvi_k_bohu` (0.713) |
| ✓ | `escs-newcomer-tri-bohove` | V kostele se chvíli mluví k Ježíšovi, chvíli k Otci a pak ještě k Duchu svatému. Znamená to, že křesťani uctívají víc bohů najednou? | 1 | 2/2 | `/in/76/_jak_muze_byt_jeden_buh_ve_trech_osobach_` (0.722) |
