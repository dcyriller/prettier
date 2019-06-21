### Handlebars: Add newline at the end of files ([#6243] by [@dcyriller])

Previously, Prettier would remove it from handlebars files.

<!-- prettier-ignore -->
```hbs
// Input
Hello

// Output (Prettier stable)
Hello
// Output (Prettier master)
Hello

```

[#6243]: https://github.com/prettier/prettier/pull/6243
[@dcyriller]: https://github.com/dcyriller
