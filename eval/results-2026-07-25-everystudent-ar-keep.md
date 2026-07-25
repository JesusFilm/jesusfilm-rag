# Eval results — 2026-07-25T04:29:37.379Z

**Model:** `qwen/qwen3-embedding-8b`
**Top-k:** 10
**Scope:** `everystudent-ar` (cases whose relevant set includes it; whole-corpus retrieval)
**Cases:** 12

## Metrics

_recall + coverage lead; P@1/MRR secondary — see docs/eval-approach.md._

| Metric | Value |
|--------|-------|
| recall@3 | 0.917 |
| recall@10 | 1.000 |
| coverage | 0.979 |
| MRR | 0.938 |
| precision@1 | 0.917 |

## Per-source coverage

(cases where the source has a relevant doc — recall = any of its docs returned; coverage = mean fraction returned)

| source | cases | recall | coverage |
|--------|------:|-------:|---------:|
| `everystudent-ar` | 12 | 1.000 | 0.979 |

## Per-language coverage

(grouped by each case's resolved retrieval language. A multi-language source
like `cru` blends its languages in the per-source view above — this splits them.
`(unscoped)` means no language was derivable: the case searched the whole
multilingual corpus, which is a case-configuration bug, not a result.)

| language | cases | recall@10 | coverage |
|----------|------:|----------:|---------:|
| `ar` | 12 | 1.000 | 0.979 |

## Per-case

| | id | question | first rank | coverage | top hit |
|---|----|----------|-----------|----------|---------|
| ✓ | `esar-skeptic-tahrif` | أصدقائي يقولون إن الكتاب الذي بين أيدي المسيحيين اليوم غير الذي نزل من عند الله وأنه تبدّل عبر القرون. ما ردّكم على هذا؟ | 1 | 4/4 | `/a/jesusinislam.html` (0.744) |
| ✓ | `esar-seeker-trinity` | لا أستطيع أن أستوعب كيف يكون الله واحداً وثلاثة في الوقت نفسه. أليس هذا تناقضاً عقلياً؟ | 1 | 1/1 | `/a/trinity.html` (0.743) |
| ✓ | `esar-skeptic-child-suffering` | إذا كان الله رحيماً وقادراً على كل شيء، فلماذا يترك طفلاً بريئاً يُغتصب ولا يحرّك ساكناً؟ | 1 | 2/2 | `/a/childraped.html` (0.786) |
| ✓ | `esar-seeker-anxiety` | قلبي مشدود طوال الوقت وأفكاري لا تتوقف في الليل، وأشعر أن التوتر يأكلني. كيف أجد راحة؟ | 1 | 2/2 | `/a/tense2.html` (0.641) |
| ✓ | `esar-newcomer-who-is-jesus` | سمعت أن المسيحيين يعتبرون عيسى أكثر من مجرد نبي. على أي أساس يقولون هذا؟ | 1 | 3/4 | `/a/jesusinislam.html` (0.609) |
| ✓ | `esar-skeptic-evidence` | أنا لا أصدّق إلا ما أراه وألمسه. أعطني دليلاً علمياً واحداً على وجود خالق. | 1 | 4/4 | `/a/universe.html` (0.660) |
| ✓ | `esar-seeker-porn` | أدمنت مشاهدة المقاطع الإباحية ولا أستطيع التوقف، وكلما حاولت رجعت وأنا أشعر بالخزي. هل هناك مخرج؟ | 1 | 1/1 | `/a/toxic.html` (0.784) |
| ✓ | `esar-seeker-women-worth` | كامرأة في مجتمعنا الشرقي أشعر أن قيمتي أقل من الرجل. هل ينظر الدين إليّ نظرة مختلفة؟ | 1 | 1/1 | `/a/fem.html` (0.623) |
| ✓ | `esar-newcomer-after-death` | أفكر كثيراً في النهاية — هل هناك شيء بعد القبر أم أن كل شيء ينتهي هناك؟ | 1 | 1/1 | `/a/then.html` (0.683) |
| ✓ | `esar-seeker-emptiness` | عندي تقريباً كل ما تمنيته، ومع ذلك أحسّ بفراغ في داخلي لا أعرف كيف أملأه. ما الذي ينقصني؟ | 4 | 2/2 | `/a/wolves.html` (0.692) |
| ✓ | `esar-skeptic-which-god` | كل دين يدّعي أنه الطريق الصحيح. لماذا أختار إلهكم أنتم دون بقية الآلهة؟ | 1 | 4/4 | `/a/whypick.html` (0.602) |
| ✓ | `esar-believer-forgiveness` | شخص قريب جرحني جرحاً عميقاً، والجميع يقول لي سامح. كيف أسامح وأنا ما زلت أتألم؟ | 1 | 1/1 | `/a/forgiveness.html` (0.642) |
