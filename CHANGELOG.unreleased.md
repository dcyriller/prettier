### Handlebars: Fix whitespaces between text and helpers ([#6206] by [@dcyriller])

Previously, Prettier was a bit eager regarding regular text whitespaces,
especially around handlebars helpers.

<!-- prettier-ignore -->
```hbs
// Input
{{#component propA}}
    for {{propB}}  do {{propC}} f
{{/component}}

// Output (Prettier stable)
{{#component propA}}
  for{{propB}}do{{propC}}f
{{/component}}

// Output (Prettier master)
{{#component propA}}
  for {{propB}}  do {{propC}} f
{{/component}}
```

Notice the whitespaces in TextNodes:

```hbs
// Input
{{#component propA}}
˽˽˽˽for˽{{propB}}˽˽do˽{{propC}}˽f
{{/component}}

// Output (Prettier stable)
{{#component propA}}
˽˽for{{propB}}do{{propC}}f
{{/component}}

// Output (Prettier master)
{{#component propA}}
˽˽for˽{{propB}}˽˽do˽{{propC}}˽f
{{/component}}
```

[#6239]: https://github.com/prettier/prettier/pull/6239
[@dcyriller]: https://github.com/dcyriller
