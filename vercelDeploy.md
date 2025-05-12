[15:19:40.769] Running build in Washington, D.C., USA (East) – iad1
[15:19:40.849] Cloning github.com/TahminaaAkterTaniaa/tuition-system (Branch: main, Commit: b5c4d7f)
[15:19:41.719] Previous build caches not available
[15:19:43.488] Cloning completed: 2.639s
[15:19:44.051] Running "vercel build"
[15:19:44.442] Vercel CLI 41.7.3
[15:19:44.748] Installing dependencies...
[15:20:00.423] npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
[15:20:00.625] npm warn deprecated are-we-there-yet@2.0.0: This package is no longer supported.
[15:20:00.681] npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
[15:20:00.813] npm warn deprecated npmlog@5.0.1: This package is no longer supported.
[15:20:00.970] npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
[15:20:01.593] npm warn deprecated gauge@3.0.2: This package is no longer supported.
[15:20:17.955] 
[15:20:17.956] added 479 packages in 33s
[15:20:17.956] 
[15:20:17.957] 156 packages are looking for funding
[15:20:17.957]   run `npm fund` for details
[15:20:18.006] Detected Next.js version: 15.3.2
[15:20:18.012] Running "npm run build"
[15:20:18.128] 
[15:20:18.128] > tuition-system@0.1.0 build
[15:20:18.129] > next build
[15:20:18.129] 
[15:20:18.736] Attention: Next.js now collects completely anonymous telemetry regarding usage.
[15:20:18.737] This information is used to shape Next.js' roadmap and prioritize features.
[15:20:18.737] You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
[15:20:18.737] https://nextjs.org/telemetry
[15:20:18.737] 
[15:20:18.839]    ▲ Next.js 15.3.2
[15:20:18.839] 
[15:20:18.866]    Creating an optimized production build ...
[15:20:36.751]  ✓ Compiled successfully in 14.0s
[15:20:36.758]    Linting and checking validity of types ...
[15:20:53.422] 
[15:20:53.422] Failed to compile.
[15:20:53.423] 
[15:20:53.423] ./src/app/login/page.tsx
[15:20:53.423] 51:14  Error: 'error' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.423] 
[15:20:53.423] ./src/app/page.tsx
[15:20:53.423] 120:57  Error: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities
[15:20:53.423] 
[15:20:53.423] ./src/app/parent/page.tsx
[15:20:53.423] 53:63  Error: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities
[15:20:53.424] 68:66  Error: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities
[15:20:53.424] 83:64  Error: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities
[15:20:53.424] 107:62  Error: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities
[15:20:53.424] 329:56  Error: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities
[15:20:53.424] 329:98  Error: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities
[15:20:53.424] 
[15:20:53.424] ./src/app/register/page.tsx
[15:20:53.424] 55:21  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.424] 
[15:20:53.424] ./src/app/teacher/page.tsx
[15:20:53.424] 107:59  Error: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities
[15:20:53.424] 201:65  Error: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
[15:20:53.424] 201:84  Error: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
[15:20:53.424] 
[15:20:53.425] ./src/app/types/next-auth.d.ts
[15:20:53.425] 2:8  Error: 'NextAuth' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.425] 
[15:20:53.425] ./src/generated/prisma/client.js
[15:20:53.425] 4:23  Error: A `require()` style import is forbidden.  @typescript-eslint/no-require-imports
[15:20:53.425] 
[15:20:53.425] ./src/generated/prisma/default.js
[15:20:53.425] 4:23  Error: A `require()` style import is forbidden.  @typescript-eslint/no-require-imports
[15:20:53.425] 
[15:20:53.425] ./src/generated/prisma/edge.js
[15:20:53.425] 18:3  Error: 'skip' is assigned a value but never used.  @typescript-eslint/no-unused-vars
[15:20:53.425] 24:3  Error: 'warnOnce' is assigned a value but never used.  @typescript-eslint/no-unused-vars
[15:20:53.425] 27:3  Error: 'getRuntime' is assigned a value but never used.  @typescript-eslint/no-unused-vars
[15:20:53.425] 28:3  Error: 'createParam' is assigned a value but never used.  @typescript-eslint/no-unused-vars
[15:20:53.425] 29:5  Error: A `require()` style import is forbidden.  @typescript-eslint/no-require-imports
[15:20:53.425] 
[15:20:53.425] ./src/generated/prisma/index-browser.js
[15:20:53.425] 13:3  Error: 'skip' is assigned a value but never used.  @typescript-eslint/no-unused-vars
[15:20:53.426] 14:5  Error: A `require()` style import is forbidden.  @typescript-eslint/no-require-imports
[15:20:53.426] 361:11  Error: 'target' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.426] 361:19  Error: 'prop' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.426] 
[15:20:53.426] ./src/generated/prisma/index.d.ts
[15:20:53.427] 7:8  Error: '$Types' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.427] 186:15  Error: 'T' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.427] 186:81  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.427] 198:21  Error: 'T' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.427] 198:60  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.427] 209:79  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.427] 221:58  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.427] 237:47  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.427] 559:13  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.427] 560:14  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.427] 564:13  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.427] 565:11  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.428] 571:49  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.428] 576:53  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.428] 576:78  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.428] 589:23  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.429] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.429] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.429] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.429] 618:11  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.429] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.430] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.430] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.430] 645:17  Error: Constraining the generic type `T` to `any` does nothing and is unnecessary.  @typescript-eslint/no-unnecessary-type-constraint
[15:20:53.430] 645:27  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.430] 645:50  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.433] 651:15  Error: Prefer using the primitive `bigint` as a type name, rather than the upper-cased `BigInt`.  @typescript-eslint/no-wrapper-object-types
[15:20:53.433] 661:27  Error: Constraining the generic type `T` to `unknown` does nothing and is unnecessary.  @typescript-eslint/no-unnecessary-type-constraint
[15:20:53.433] 692:23  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.434] 722:26  Error: Constraining the generic type `A` to `any` does nothing and is unnecessary.  @typescript-eslint/no-unnecessary-type-constraint
[15:20:53.434] 722:36  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.434] 722:53  Error: The `Function` type accepts any function-like value.
[15:20:53.434] Prefer explicitly defining any function parameters and return type.  @typescript-eslint/no-unsafe-function-type
[15:20:53.434] 730:32  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.434] 771:23  Error: Constraining the generic type `A1` to `any` does nothing and is unnecessary.  @typescript-eslint/no-unnecessary-type-constraint
[15:20:53.434] 771:34  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.434] 771:39  Error: Constraining the generic type `A2` to `any` does nothing and is unnecessary.  @typescript-eslint/no-unnecessary-type-constraint
[15:20:53.434] 771:50  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.434] 826:9  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.434] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.434] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.434] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.435] 835:40  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.435] 836:41  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.435] 881:39  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.435] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.435] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.435] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.435] 881:121  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.435] 882:122  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.435] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.435] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.435] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.435] 885:111  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.435] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.435] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.435] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.436] 2155:16  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.436] 2158:71  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.436] 2159:19  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.436] 2162:44  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.436] 2163:19  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.436] 2166:71  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.436] 2167:19  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.436] 2170:44  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.436] 2171:19  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.436] 2263:25  Error: Constraining the generic type `T` to `any` does nothing and is unnecessary.  @typescript-eslint/no-unnecessary-type-constraint
[15:20:53.436] 2263:35  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.436] 2312:11  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.436] 2320:30  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.436] 2354:41  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.436] 2376:52  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.436] 2383:52  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.436] 2390:56  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.436] 2397:60  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.436] 2404:57  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.436] 2420:44  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2441:58  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2448:58  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2455:53  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2462:61  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2476:44  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2495:54  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2502:56  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2516:43  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2535:60  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2542:54  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2558:42  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2579:56  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2586:56  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2593:54  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2600:51  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2694:33  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2754:31  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2866:46  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.437] 2866:116  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.437] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.437] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.438] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.438] 2867:46  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.438] 2867:116  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.438] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.438] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.438] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.438] 2893:17  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.438] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.439] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.439] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.439] 2898:22  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.439] 2903:121  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.439] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.439] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.439] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.439] 3163:41  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.439] 3247:13  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.439] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.439] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.439] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.439] 3257:13  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.439] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.439] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.439] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.439] 3265:9  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.439] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.440] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.440] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.440] 3271:80  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.440] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.440] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.440] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.440] 3284:144  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.440] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.440] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.440] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.440] 3286:51  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.440] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.440] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.440] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.440] 3287:51  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.440] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.440] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.440] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.440] 3288:47  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.440] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.440] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.440] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.440] 3289:49  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.440] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.440] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.441] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.441] 3290:53  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.441] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.441] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.441] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.441] 3291:53  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.441] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.441] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.441] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.441] 3292:61  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.441] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.441] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.441] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.441] 3293:69  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.441] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.441] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.441] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.441] 3294:63  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.441] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.441] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.441] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.441] 3301:148  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.441] 3307:51  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.441] 3557:34  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.442] 3611:34  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.442] 3707:34  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.442] 4054:36  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.442] 4126:34  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.442] 4267:17  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.442] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.442] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.442] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.442] 4272:25  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.442] 4277:124  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.442] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.442] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.442] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.442] 4537:41  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.442] 4621:13  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.442] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.442] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.442] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.442] 4631:13  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.442] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.442] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.443] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.443] 4639:9  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.443] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.443] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.443] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.443] 4645:83  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.443] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.443] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.443] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.443] 4658:147  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.443] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.443] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.443] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.443] 4660:47  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.443] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.443] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.443] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.443] 4667:148  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.443] 4673:51  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.443] 4926:37  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.443] 4984:37  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.443] 5084:37  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.443] 5169:36  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.443] 5229:34  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.443] 5318:17  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.443] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.443] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.443] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.443] 5323:25  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.443] 5328:124  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.443] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.443] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.444] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.444] 5588:41  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.444] 5672:13  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.444] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.444] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.444] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.444] 5682:13  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.444] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.444] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.444] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.444] 5690:9  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.444] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.444] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.444] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.444] 5696:83  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.444] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.444] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.444] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.444] 5709:147  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.444] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.444] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.444] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.444] 5711:47  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.444] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.444] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.444] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.444] 5718:148  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.444] 5724:51  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.444] 5969:37  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.444] 6027:37  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.445] 6127:37  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.445] 6206:46  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.445] 6266:44  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.445] 6329:14  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.445] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.445] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.445] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.445] 6335:17  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.445] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.445] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.445] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.445] 6340:35  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.445] 6345:134  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.445] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.445] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.445] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.445] 6605:41  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.446] 6689:13  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.446] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.446] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.446] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.446] 6699:13  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.446] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.446] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.446] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.446] 6707:9  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.446] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.446] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.446] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.446] 6713:93  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.446] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.447] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.447] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.447] 6726:55  Error: 'Null' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.447] 6726:69  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.447] 6726:137  Error: 'GlobalOmitOptions' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.447] 6726:157  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.447] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.447] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.447] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.447] 6734:148  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.447] 6740:51  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.447] 6960:47  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.447] 7010:47  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.447] 7098:47  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.447] 7215:36  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.447] 7275:34  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.447] 7414:17  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.447] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.447] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.447] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.447] 7419:25  Error: 'ExtArgs' is defined but never used.  @typescript-eslint/no-unused-vars
[15:20:53.447] 7424:124  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.447] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.447] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.447] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.447] 7684:41  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
[15:20:53.447] 7768:13  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.447] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.447] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.447] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.447] 7778:13  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.448] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.448] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.448] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.448] 7786:9  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
[15:20:53.448] - If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
[15:20:53.448] - If you want a type meaning "any object", you probably want `object` instead.
[15:20:53.448] - If you want a type meaning "any value", you probably want `unknown` instead.  @typescript-eslint/no-empty-object-type
[15:20:53.448] 7792:83  Error: The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.