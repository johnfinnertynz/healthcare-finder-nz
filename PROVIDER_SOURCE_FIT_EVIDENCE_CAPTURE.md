# Provider Source-Fit Evidence Capture

Generated: 2026-06-01T06:02:01.922Z

This report fetches public source pages for selected source-fit findings and captures short evidence excerpts. It does not change `providers.json`.

## Summary

- Findings considered: 30
- Source support found: 6
- Safe removal candidates: 4
- Needs human browser review: 17
- Fetch failed: 0
- Source skipped/not fetched: 3

## Status Counts

| Status | Count |
| --- | ---: |
| needs_human_browser_review | 17 |
| source_skipped | 3 |
| safe_removal_candidate | 4 |
| source_support_found | 6 |

## Review Items

| Status | Provider | Rule | Target | Evidence / action |
| --- | --- | --- | --- | --- |
| needs_human_browser_review | auckland-auckland-mental-wellness-centre | broad-tag-without-source-support | depression | needs_more_info |
| needs_human_browser_review | auckland-auckland-mental-wellness-centre | broad-tag-without-source-support | anxiety | needs_more_info |
| needs_human_browser_review | auckland-mt-eden-counselling-psychotherapy | weak-telehealth-evidence | telehealth | needs_more_info |
| source_skipped | auckland-northspan-wellbeing | broad-tag-without-source-support | depression | needs_more_info |
| source_skipped | auckland-northspan-wellbeing | broad-tag-without-source-support | anxiety | needs_more_info |
| source_skipped | auckland-northspan-wellbeing | broad-tag-without-source-support | trauma | needs_more_info |
| needs_human_browser_review | auckland-visionwest-wellbeing-centre | broad-tag-without-source-support | depression | needs_more_info |
| needs_human_browser_review | auckland-visionwest-wellbeing-centre | broad-tag-without-source-support | anxiety | needs_more_info |
| needs_human_browser_review | auckland-visionwest-wellbeing-centre | broad-tag-without-source-support | trauma | needs_more_info |
| needs_human_browser_review | auckland-visionwest-wellbeing-centre | weak-telehealth-evidence | telehealth | needs_more_info |
| safe_removal_candidate | bay-of-plenty-adult-community-mental-health | weak-telehealth-evidence | telehealth | review-gated adjust: remove unsupported matching tag/flags |
| safe_removal_candidate | bay-of-plenty-bay-counselling | broad-tag-without-source-support | depression | review-gated adjust: remove unsupported matching tag/flags |
| safe_removal_candidate | bay-of-plenty-bay-counselling | broad-tag-without-source-support | anxiety | review-gated adjust: remove unsupported matching tag/flags |
| needs_human_browser_review | bay-of-plenty-psychology-group-tauranga | broad-tag-without-source-support | depression | needs_more_info |
| needs_human_browser_review | bay-of-plenty-psychology-group-tauranga | broad-tag-without-source-support | anxiety | needs_more_info |
| source_support_found | bay-of-plenty-te-puna-ora-mataatua-counselling | broad-tag-without-source-support | depression | ngs, indoors at our therapy space, or outdoors in our taiao – it’s all about what works for you. Our counselling covers: Mental health Alcohol & Addictions Trauma LGBQT+ Depression |
| source_support_found | bay-of-plenty-te-puna-ora-mataatua-counselling | broad-tag-without-source-support | anxiety | s at our therapy space, or outdoors in our taiao – it’s all about what works for you. Our counselling covers: Mental health Alcohol & Addictions Trauma LGBQT+ Depression Anxiety Bu |
| source_support_found | bay-of-plenty-te-puna-ora-mataatua-counselling | broad-tag-without-source-support | trauma | pa Māori and Clinical Frameworks, our team is dedicated to working alongside individuals and whānau to change from a cycle of constant hurt, blaming, denial and reliving trauma. Ou |
| source_support_found | bay-of-plenty-te-puna-ora-mataatua-counselling | broad-tag-without-source-support | addiction | s dedicated to working alongside individuals and whānau to change from a cycle of constant hurt, blaming, denial and reliving trauma. Our full range of mental health and addiction |
| needs_human_browser_review | canterbury-lucid-psychotherapy | broad-tag-without-source-support | depression | needs_more_info |
| needs_human_browser_review | canterbury-lucid-psychotherapy | broad-tag-without-source-support | anxiety | needs_more_info |
| needs_human_browser_review | canterbury-lucid-psychotherapy | broad-tag-without-source-support | trauma | needs_more_info |
| source_support_found | canterbury-talking-therapy | broad-tag-without-source-support | depression | Deliefde Ursula Klein Ingrid Gunby Twane Cheze-Gower Emily Cathro Explore Therapy Counselling Professional Supervision Psychotherapy Issues Treated Anxiety Codependency Depression |
| source_support_found | canterbury-talking-therapy | broad-tag-without-source-support | anxiety | Home Therapists Irene Deliefde Ursula Klein Ingrid Gunby Twane Cheze-Gower Emily Cathro Explore Therapy Counselling Professional Supervision Psychotherapy Issues Treated Anxiety Co |
| needs_human_browser_review | canterbury-te-tahi-youth | weak-rainbow-evidence | rainbow | needs_more_info |
| needs_human_browser_review | christchurch-psychmed-amanda-baird | broad-tag-without-source-support | work | needs_more_info |
| needs_human_browser_review | christchurch-psychmed-natasha-pomeroy | broad-tag-without-source-support | work | needs_more_info |
| needs_human_browser_review | christchurch-psychmed-steve-humm | broad-tag-without-source-support | depression | needs_more_info |
| safe_removal_candidate | dunedin-bernadette-berry-delta-psychology | broad-tag-without-source-support | anxiety | review-gated adjust: remove unsupported matching tag/flags |
| needs_human_browser_review | dunedin-otago-clinical-psychology-centre | broad-tag-without-source-support | trauma | needs_more_info |

## Safety Notes

- Source support found is not an automatic approval. A reviewer must confirm the excerpt matches the current provider and field.
- Safe removal candidates are review-gated downgrades only. They remove unsupported tags or telehealth flags; they do not add new capability claims.
- Blocked, skipped, failed, or missing sources should remain `needs_more_info` or go to human browser review.
