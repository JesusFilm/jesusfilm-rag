# Eval results — 2026-07-24T06:58:45.743Z

**Model:** `qwen/qwen3-embedding-8b`
**Top-k:** 10
**Scope:** `everystudent` (cases whose relevant set includes it; whole-corpus retrieval)
**Cases:** 22

## Metrics

_recall + coverage lead; P@1/MRR secondary — see docs/eval-approach.md._

| Metric | Value |
|--------|-------|
| recall@3 | 0.864 |
| recall@10 | 0.955 |
| coverage | 0.628 |
| MRR | 0.816 |
| precision@1 | 0.727 |

## Per-source coverage

(cases where the source has a relevant doc — recall = any of its docs returned; coverage = mean fraction returned)

| source | cases | recall | coverage |
|--------|------:|-------:|---------:|
| `cru` | 9 | 1.000 | 0.769 |
| `everystudent` | 22 | 0.727 | 0.648 |
| `familylife` | 4 | 0.750 | 0.542 |
| `jesusfilm-org` | 7 | 0.429 | 0.357 |
| `sightline-ministry` | 17 | 0.824 | 0.522 |
| `starting-with-god` | 9 | 0.556 | 0.407 |
| `thelife` | 11 | 1.000 | 0.767 |

## Per-language coverage

(grouped by each case's resolved retrieval language. A multi-language source
like `cru` blends its languages in the per-source view above — this splits them.
`(unscoped)` means no language was derivable: the case searched the whole
multilingual corpus, which is a case-configuration bug, not a result.)

| language | cases | recall@10 | coverage |
|----------|------:|----------:|---------:|
| `en` | 22 | 0.955 | 0.628 |

## Per-case

| | id | question | first rank | coverage | top hit |
|---|----|----------|-----------|----------|---------|
| ✓ | `swg-seeker-anxiety` | My mind races with anxiety constantly and I can't switch it off — is there a way to actually find peace? | 2 | 9/19 | `/faq/peace.html` (0.740) |
| ✓ | `swg-seeker-failure` | I keep messing up and feel like God must be so disappointed in me. Is there any hope? | 1 | 5/22 | `/hope-not-wishful-thinking-for-christians` (0.714) |
| ✓ | `swg-skeptic-faith-proof` | Isn't faith just believing something with no proof? Sounds like wishful thinking. | 2 | 3/6 | `/devotionals/if-only-i-could-see` (0.658) |
| ✓ | `swg-skeptic-jesus-deity` | Did Jesus ever actually claim to be God, or did the church invent that later? | 1 | 7/14 | `/two-reasons-skeptics-believe-jesus-is-not-god` (0.738) |
| ✓ | `swg-skeptic-gods-love` | If God supposedly loves everyone, how would I even know that's true and not just something Christians say? | 5 | 4/8 | `/faq/LGBTQ.html` (0.691) |
| ✓ | `cru-believer-guidance` | How do I actually figure out what God wants me to do when I'm facing a hard decision? | 1 | 8/22 | `/us/en/train-and-grow/spiritual-growth/point-toward-gods-will.html` (0.765) |
| ✓ | `cru-newcomer-holy-spirit` | Who exactly is the Holy Spirit, and what is he supposed to do in my life? | 1 | 4/7 | `/new-life/spirit-filled.html` (0.794) |
| ✓ | `cru-skeptic-jesus-uniqueness` | Every religion has its founder. What actually sets Jesus apart from all the others? | 1 | 9/12 | `/wires/religions.html` (0.672) |
| ✓ | `jf-newcomer-why-jesus-died` | What was the point of Jesus dying on a cross — why did it have to happen? | 4 | 1/10 | `/blog/why-jesus-had-to-die` (0.768) |
| ✓ | `jf-skeptic-bible-contradictions` | People say the Bible is riddled with contradictions and errors — how do you square that? | 1 | 4/5 | `/contradictions-skew-bible-truth` (0.783) |
| ✓ | `sl-skeptic-god-exists` | Is there any actual evidence that God exists, or is it just blind belief? | 2 | 4/7 | `/us/en/train-and-grow/share-the-gospel/obstacles-to-faith/does-god-exist-six-straight-forward-reasons.html` (0.689) |
| ✓ | `sl-skeptic-suffering` | If God is real and good, why is there so much suffering and evil in the world? | 1 | 5/14 | `/videos/is-god-good.html` (0.750) |
| ✓ | `sl-seeker-meaning` | Nothing in my life feels like it means anything. Is there actually a point to any of this? | 1 | 5/6 | `/feeling-purposeless-cause-cure` (0.659) |
| ✓ | `tl-skeptic-cosmology` | Couldn't the universe just have come from nothing without needing a creator? | 1 | 7/7 | `/why-the-universe-from-nothing-is-a-non-starter` (0.726) |
| ✓ | `es-seeker-self-hatred` | I look in the mirror and hate the person staring back. Could God really love someone who can't stand themselves? | 1 | 6/13 | `/daily-devo/how-can-anyone-love-a-mess-like-this` (0.680) |
| ✓ | `es-seeker-fear-of-death` | I lie awake at night terrified of dying. What actually happens to us when we die? | 1 | 3/3 | `/have-you-heard-about-henry` (0.659) |
| ✓ | `es-newcomer-same-god` | Do all religions basically worship the same God, just in different ways? | 1 | 8/8 | `/features/religions-of-the-world.html` (0.642) |
| ✗ | `es-newcomer-astrology` | I check my horoscope every morning and I'm pretty into astrology — is there anything actually wrong with that? | miss | 0/1 | `/articles/topics/marriage/archived-content/reader-comments/reader-responses-to-50-shades-of-caution` (0.447) |
| ✓ | `es-skeptic-scientists` | Name one serious scientist who actually believes in God. People who understand how the world works don't buy this stuff, right? | 1 | 3/3 | `/christianity-science-bogus-feud` (0.605) |
| ✓ | `es-seeker-muslim-background` | I grew up Muslim and lately I can't stop wondering about who Jesus really is. What do Christians claim about him that Islam doesn't? | 1 | 8/10 | `/us/en/train-and-grow/spiritual-growth/core-christian-beliefs/what-makes-christianity-different.html` (0.678) |
| ✓ | `es-newcomer-reincarnation` | Is reincarnation real? Do we keep coming back as someone else until we get it right? | 1 | 1/1 | `/forum/reincarnation.html` (0.599) |
| ✓ | `es-skeptic-show-miracle` | If God wants people to believe in him, why doesn't he just do an obvious miracle on live TV and settle it? | 1 | 1/1 | `/forum/miracles2.html` (0.733) |
