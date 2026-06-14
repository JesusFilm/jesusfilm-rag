# Production corpus certification — 2026-06-10

> **First full whole-corpus eval against the live JF Railway production corpus**
> (6 sources / 8,514 docs / 23,522 chunks), run via `pnpm eval:production` after
> promoting every built source to prod (#29). It reproduces the dev / slice-#6
> numbers within rounding — recall@10 **1.000**, recall@3 **0.984**, coverage
> **0.646** (dev 0.648), MRR **0.870**, P@1 **0.758** — certifying that the
> local quality claim holds in production, not just on the dev corpus.
>
> Per-source matches dev for 5 of 6; `starting-with-god` sits slightly lower
> (0.476 / 0.319 vs dev 0.524 / 0.367) because it is still the original Railway
> bring-up ingest, not re-loaded in this batch. `cru-10-basic-steps` at
> 0.133 / 0.067 is the expected FOLLOW-UP I (#15) crowding, identical to dev —
> mechanism, not regression. recall@10 = 1.000 means every case is answerable.
>
> Kept (`-keep` suffix) as the durable certification record; routine
> `eval/results-*.md` are gitignored. See docs/ops/prod-ingest.md.

_Raw `eval:production` output below._

# Eval results — 2026-06-10T09:46:36.111Z

**Model:** `openai/text-embedding-3-small`
**Top-k:** 10
**Scope:** whole-corpus
**Cases:** 62

## Metrics

_recall + coverage lead; P@1/MRR secondary — see docs/eval-approach.md._

| Metric | Value |
|--------|-------|
| recall@3 | 0.984 |
| recall@10 | 1.000 |
| coverage | 0.646 |
| MRR | 0.870 |
| precision@1 | 0.758 |

## Per-source coverage

(cases where the source has a relevant doc — recall = any of its docs returned; coverage = mean fraction returned)

| source | cases | recall | coverage |
|--------|------:|-------:|---------:|
| `cru-10-basic-steps` | 15 | 0.133 | 0.067 |
| `familylife` | 16 | 1.000 | 0.958 |
| `jesusfilm-org` | 28 | 0.750 | 0.604 |
| `sightline-ministry` | 37 | 0.784 | 0.582 |
| `starting-with-god` | 21 | 0.476 | 0.319 |
| `thelife` | 28 | 0.929 | 0.777 |

## Per-case

| | id | question | first rank | coverage | top hit |
|---|----|----------|-----------|----------|---------|
| ✓ | `swg-seeker-anxiety` | My mind races with anxiety constantly and I can't switch it off — is there a way to actually find peace? | 1 | 7/13 | `/articles/topics/life-issues/challenges/mental-and-emotional-issues/anxiety-how-can-i-cope` (0.572) |
| ✓ | `swg-seeker-failure` | I keep messing up and feel like God must be so disappointed in me. Is there any hope? | 1 | 9/19 | `/hope-not-wishful-thinking-for-christians` (0.632) |
| ✓ | `swg-seeker-porn` | I can't stop looking at porn and I hate myself for it — is there any way out? | 1 | 1/3 | `/struggles/how-to-get-free-from-porn.html` (0.594) |
| ✓ | `swg-skeptic-faith-proof` | Isn't faith just believing something with no proof? Sounds like wishful thinking. | 1 | 2/5 | `/knowing-god/faith.html` (0.529) |
| ✓ | `swg-skeptic-jesus-deity` | Did Jesus ever actually claim to be God, or did the church invent that later? | 2 | 2/8 | `/two-reasons-skeptics-believe-jesus-is-not-god` (0.658) |
| ✓ | `swg-skeptic-gods-love` | If God supposedly loves everyone, how would I even know that's true and not just something Christians say? | 1 | 2/3 | `/questions/does-god-really-love-me.html` (0.615) |
| ✓ | `swg-believer-assurance` | I've trusted Christ but I still doubt whether my salvation is really secure — what does the Bible say? | 3 | 4/9 | `/articles/topics/faith/essentials-faith/growing-in-your-faith/when-waves-of-doubt-rock-your-faith-dont-panic` (0.606) |
| ✓ | `swg-believer-holy-spirit` | How do I actually live day to day in the power of the Holy Spirit? | 1 | 5/10 | `/the-spirit-filled-life` (0.716) |
| ✓ | `swg-newcomer-gospel` | What's the core message of Christianity — what's it actually all about? | 1 | 3/6 | `/three-foundational-truths-christianity` (0.582) |
| ✓ | `swg-newcomer-baptism` | Do I need to be baptized to become a Christian? | 1 | 1/1 | `/questions/baptism.html` (0.683) |
| ✓ | `cru-newcomer-new-testament` | I want to start reading the New Testament but don't know how it's organized or where to begin — can you orient me? | 2 | 2/3 | `/blog/best-way-to-read-the-bible` (0.628) |
| ✓ | `cru-believer-old-testament` | The Old Testament feels like a confusing jumble of names and events. How does the whole story actually hang together? | 1 | 1/2 | `/us/en/train-and-grow/10-basic-steps/5-the-bible.html` (0.554) |
| ✓ | `cru-stewardship` | As a Christian, does God have a claim on my money — how am I supposed to handle my finances and possessions? | 2 | 1/3 | `/articles/topics/marriage/marriage-challenges/finances/how-do-we-deal-with-financial-difficulties` (0.707) |
| ✓ | `cru-believer-witnessing` | I want to share my faith but I freeze up. How did Jesus himself approach people, and what does it take? | 1 | 3/8 | `/blog/evangelism-tips-non-evangelists` (0.691) |
| ✓ | `cru-believer-guidance` | How do I actually figure out what God wants me to do when I'm facing a hard decision? | 2 | 8/13 | `/articles/topics/marriage/staying-married/communication/6-questions-to-ask-when-youre-making-a-big-decision-together` (0.686) |
| ✓ | `cru-believer-bible-study` | Is there a practical method for studying the Bible on my own, instead of just reading randomly? | 2 | 2/4 | `/how-to-read-the-bible` (0.663) |
| ✓ | `cru-newcomer-prayer` | I never know what to actually say when I pray. Is there a simple way to build a daily prayer habit? | 1 | 6/11 | `/god-loves-time-with-you` (0.639) |
| ✓ | `cru-newcomer-holy-spirit` | Who exactly is the Holy Spirit, and what is he supposed to do in my life? | 2 | 1/3 | `/the-power-you-need` (0.701) |
| ✓ | `cru-seeker-abundant-life` | Being a Christian honestly feels flat and rule-bound to me. Is there supposed to be more life to it than this? | 1 | 4/11 | `/the-spirit-filled-life` (0.628) |
| ✓ | `cru-skeptic-jesus-uniqueness` | Every religion has its founder. What actually sets Jesus apart from all the others? | 1 | 3/6 | `/copycat-religion-christianity` (0.593) |
| ✓ | `jf-newcomer-who-is-jesus` | I don't really know anything about Jesus — who was he and what did he actually do? | 2 | 1/3 | `/us/en/train-and-grow/10-basic-steps/intro-the-uniqueness-of-jesus.html` (0.550) |
| ✓ | `jf-newcomer-why-jesus-died` | What was the point of Jesus dying on a cross — why did it have to happen? | 3 | 1/4 | `/why-did-jesus-have-to-die` (0.737) |
| ✓ | `jf-newcomer-great-commission` | Christians keep talking about being 'sent to make disciples of all nations' — where's that from and what does it mean? | 1 | 4/5 | `/blog/great-commission-for` (0.641) |
| ✓ | `jf-skeptic-resurrection` | Christians stake everything on the resurrection — why would an empty tomb 2,000 years ago even matter? | 2 | 3/5 | `/jesus-resurrection-fact` (0.708) |
| ✓ | `jf-skeptic-bible-contradictions` | People say the Bible is riddled with contradictions and errors — how do you square that? | 1 | 4/4 | `/contradictions-skew-bible-truth` (0.701) |
| ✓ | `jf-skeptic-intolerant` | Isn't it arrogant for Christians to claim Jesus is the only way? That seems intolerant. | 1 | 3/4 | `/is-christianity-intolerant` (0.574) |
| ✓ | `jf-believer-parable-sower` | What's Jesus really getting at in the story about a farmer scattering seed on different soils? | 1 | 1/1 | `/blog/parable-of-sower` (0.744) |
| ✓ | `jf-believer-good-samaritan` | What's the deeper point of the story about the man beaten on the road and the foreigner who stopped to help? | 1 | 1/1 | `/blog/parable-good-samaritan` (0.525) |
| ✓ | `jf-believer-missional-everyday` | I'm not a missionary, just someone with a normal job — how do I actually live 'on mission' in ordinary life? | 1 | 6/8 | `/daily-devo/missionary-in-the-mirror` (0.603) |
| ✓ | `jf-believer-disciple-making` | I want to help someone else grow in their faith, not just grow myself — where do I even start? | 1 | 4/6 | `/discipleship-101` (0.631) |
| ✓ | `jf-seeker-grief` | I just lost someone I love and I'm drowning — does Jesus have anything for someone grieving? | 1 | 4/10 | `/devotionals/a-man-like-us` (0.638) |
| ✓ | `jf-seeker-distant-god` | God feels distant and silent lately — how do I get close to him again? | 2 | 2/4 | `/when-god-feels-distant` (0.683) |
| ✓ | `sl-skeptic-god-exists` | Is there any actual evidence that God exists, or is it just blind belief? | 1 | 2/5 | `/why-believe-in-god` (0.618) |
| ✓ | `sl-skeptic-suffering` | If God is real and good, why is there so much suffering and evil in the world? | 2 | 1/2 | `/articles/topics/faith/essentials-faith/growing-in-your-faith/why-does-god-allow-suffering` (0.643) |
| ✓ | `sl-skeptic-science` | Hasn't science basically disproved religion? How can a thinking person believe in miracles? | 1 | 2/3 | `/science-disprove-miracles` (0.654) |
| ✓ | `sl-skeptic-morality` | I'm an atheist and a good person. Why would anyone need God to be moral? | 1 | 2/3 | `/good-without-god` (0.645) |
| ✓ | `sl-skeptic-gospels-reliable` | How can anyone trust the Gospels when they were written decades later by biased followers? | 1 | 8/11 | `/are-the-gospels-anonymous` (0.640) |
| ✓ | `sl-skeptic-hidden-god` | If God wanted a relationship with me, why does he stay so hidden and silent? | 1 | 5/8 | `/listening-for-god-to-speak` (0.605) |
| ✓ | `sl-skeptic-copycat` | Isn't Jesus just a recycled myth — a copy of older dying-and-rising gods? | 1 | 2/2 | `/pagan-influences-gospels-reliable-video-6` (0.730) |
| ✓ | `sl-seeker-meaning` | Nothing in my life feels like it means anything. Is there actually a point to any of this? | 1 | 2/3 | `/feeling-purposeless-cause-cure` (0.589) |
| ✓ | `sl-believer-doubt` | I'm a Christian but I'm wracked with doubts and it scares me. Is doubting a sin? | 1 | 2/3 | `/christian-doubt-okay-faith` (0.615) |
| ✓ | `sl-believer-apologetics` | How do I have a productive conversation about faith with a skeptical friend without it turning into an argument? | 1 | 2/3 | `/effectively-dialogue-skeptics` (0.666) |
| ✓ | `tl-seeker-grief-child` | My child died and I don't know how to keep going — does God have anything for a parent like me? | 2 | 6/10 | `/articles/topics/life-issues/challenges/loss-of-a-child-life-issues/10-ways-to-help-parents-with-grieving-hearts` (0.674) |
| ✓ | `tl-seeker-abortion` | I had an abortion and I can't forgive myself — is there any healing for what I've done? | 1 | 2/6 | `/what-have-i-done-finding-healing-after-my-abortion` (0.641) |
| ✓ | `tl-seeker-depression` | I'm depressed and on antidepressants — can my faith and meds actually coexist? | 1 | 4/8 | `/depression-antidepressants-and-the-spiritual-dimension` (0.598) |
| ✓ | `tl-skeptic-cosmology` | Couldn't the universe just have come from nothing without needing a creator? | 1 | 3/3 | `/why-the-universe-from-nothing-is-a-non-starter` (0.638) |
| ✓ | `tl-skeptic-hell` | If God is loving, why would he send anyone to hell? | 1 | 2/3 | `/daily-devo/love-and-hell-dont-mix-do-they-2` (0.679) |
| ✓ | `tl-believer-marriage-drift` | Our marriage feels stale and we keep arguing — how do we keep it alive? | 1 | 9/14 | `/articles/topics/marriage/staying-married/romance-and-sex/5-keys-to-a-truly-romantic-marriage` (0.644) |
| ✓ | `tl-believer-obedience` | Sometimes God seems to ask things I really don't want to do — how do I live in obedience when I'd rather not? | 1 | 3/6 | `/daily-devo/when-the-pressure-is-on-2` (0.649) |
| ✓ | `tl-believer-disciple-new-christian` | My friend just trusted Christ for the first time — what does she need to know first, and how do I help her without overwhelming her? | 1 | 5/8 | `/they-said-yes-now-what` (0.675) |
| ✓ | `tl-newcomer-decision` | I think I just decided to trust Jesus — what now? What's the very next step? | 1 | 2/5 | `/your-life-with-jesus` (0.626) |
| ✓ | `tl-newcomer-find-church` | I want to start going to church but I don't know how to pick one — what should I look for? | 1 | 5/5 | `/how-to-choose-a-church` (0.675) |
| ✓ | `fl-seeker-affair-trust` | My spouse had an affair and I don't know if I can ever trust them again — should I even try to save this? | 2 | 5/6 | `/articles/topics/marriage/troubled-marriage/infidelity/sharing-past-extramarital-affairs-with-your-spouse` (0.630) |
| ✓ | `fl-believer-spiritual-leader` | I want to be the spiritual leader of my family but I feel inadequate — where do I even start? | 1 | 7/7 | `/articles/topics/parenting/essentials/fathers/7-essentials-to-help-you-be-the-spiritual-leader-of-your-family` (0.673) |
| ✓ | `fl-seeker-teen-prodigal` | My teenager has walked away from God and I'm scared of losing them for good — what do I do? | 1 | 4/8 | `/articles/topics/parenting/foundations/spiritual-development/10-ideas-to-challenge-your-teenage-son-to-make-his-faith-his-own` (0.609) |
| ✓ | `fl-believer-teen-own-faith` | How do I help my teenager actually own their faith instead of just inheriting mine? | 1 | 6/6 | `/articles/topics/parenting/foundations/spiritual-development/10-ideas-to-challenge-your-teenage-son-to-make-his-faith-his-own` (0.700) |
| ✓ | `fl-seeker-single-parent` | I'm a single parent and I'm exhausted — does God have anything for someone doing this alone? | 1 | 5/5 | `/articles/topics/parenting/essentials/mothers/to-the-single-mom-on-mothers-day` (0.635) |
| ✓ | `fl-newcomer-premarital` | What does the Bible say about preparing for marriage before the wedding? | 1 | 6/6 | `/articles/topics/marriage/getting-married/engagements-and-weddings/are-you-preparing-for-a-wedding-or-for-a-marriage` (0.712) |
| ✓ | `fl-skeptic-sex-marriage` | Why does Christianity insist on waiting until marriage for sex? It seems outdated. | 4 | 5/5 | `/devotionals/wise-intimacy` (0.649) |
| ✓ | `fl-seeker-blended-family` | Our blended family is full of conflict and the kids resent us — is there any hope? | 1 | 5/5 | `/articles/topics/blended-family/stepparents/stepfamily-living/survival-tips-for-the-first-year-of-stepfamily-life` (0.644) |
| ✓ | `fl-believer-prodigal-adult` | My adult child has walked away from the faith — how do I keep praying without giving up? | 1 | 7/7 | `/articles/topics/parenting/ages-and-stages/adult-children/how-not-to-be-a-toxic-parent-to-your-adult-child` (0.626) |
| ✓ | `fl-newcomer-discipline-child` | What's the biblical way to discipline a young child without crushing their spirit? | 1 | 6/6 | `/articles/topics/parenting/parenting-challenges/discipline/the-forgotten-part-of-discipline` (0.683) |
