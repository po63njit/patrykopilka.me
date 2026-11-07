# Release validation

Run the commands in the README and check the CI result for the exact release commit before merging.

The automated checks cover:

- Astro production build, six routes with no private review interface.
- Web unit tests for approved IBM content, selected designs, orbit movement, pause/resume, reduced-motion default, focus hold and hidden-tab scheduling.
- Targeted strict TypeScript checks for the orbit script and approved experience data.
- Generated-page heading/ID checks, internal links/assets, canonical metadata, approved IBM wording/date and the navigable existing blog post.
- Existing API tests, although the API is unchanged.

The selected designs were also checked in a desktop browser and in five phone-width frames (375–390px) without horizontal overflow. Phone-width frames are not a physical-device or touch-input test. This is not a full accessibility or cross-browser audit. No full Astro diagnostic/lint command is configured.
