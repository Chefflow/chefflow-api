# Requirements — &lt;feature-id&gt;

> **Owner**: &lt;name&gt;  ·  **Status**: pending → spec_ready
> **Source of truth** for what this feature MUST do. Written in **EARS** notation.
> The Implementer is forbidden from coding anything not anchored to a requirement here.

---

## 1. Context

&lt;1–3 sentences. Why this feature exists. Stakeholders, motivation, the user pain it removes.&gt;

## 2. In scope / Out of scope

**In scope**
- &lt;bullet&gt;

**Out of scope**
- &lt;bullet — to prevent scope creep&gt;

## 3. Functional requirements (EARS)

Use the canonical EARS patterns:

| Pattern  | Template |
|----------|----------|
| Ubiquitous | The &lt;system&gt; **shall** &lt;action&gt;. |
| Event-driven | **When** &lt;trigger&gt;, the &lt;system&gt; **shall** &lt;action&gt;. |
| State-driven | **While** &lt;state&gt;, the &lt;system&gt; **shall** &lt;action&gt;. |
| Unwanted behaviour | **If** &lt;condition&gt;, **then** the &lt;system&gt; **shall** &lt;action&gt;. |
| Optional | **Where** &lt;feature flag/role&gt;, the &lt;system&gt; **shall** &lt;action&gt;. |

### REQ-1 — &lt;short title&gt;
**When** a request `POST /resource` arrives with a valid JWT and a body matching `CreateResourceDto`,
the API **shall** persist the resource owned by `userId` and return `201` with the created entity.

### REQ-2 — &lt;short title&gt;
**If** the authenticated user does not own the requested resource,
**then** the API **shall** respond `403 Forbidden` with no body leakage.

### REQ-N — …

## 4. Non-functional requirements

- **Security**: &lt;e.g. only owner can read/mutate; rate limited 10/min&gt;
- **Performance**: &lt;e.g. p95 &lt; 200 ms on N=1k rows&gt;
- **Observability**: &lt;what to log, what to never log&gt;

## 5. Acceptance criteria (1:1 with REQs)

Every REQ above MUST have at least one test mapped to it.
The Reviewer/Tester rejects the feature if any REQ has no corresponding test.

| Req   | Test type | Test file (planned) |
|-------|-----------|---------------------|
| REQ-1 | unit + e2e | `src/&lt;mod&gt;/&lt;mod&gt;.service.spec.ts`, `test/&lt;feat&gt;.e2e-spec.ts` |
| REQ-2 | e2e | `test/&lt;feat&gt;.e2e-spec.ts` |
