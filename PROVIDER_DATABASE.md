# Provider Database

`providers.json` is the local first-contact database used by the website.

Each record should be verified before it is added. Prefer official provider pages,
Healthpoint, professional body directories, Health NZ pages, or the provider's own
website. Do not add personal mobile numbers or private emails unless they are
published as professional contact details.

## Fields

- `id`: stable lowercase id, for example `canterbury-example-service`
- `name`: public service or provider name
- `type`: one of `gp`, `counsellor`, `psychologist`, `psychiatrist`, `helpline`,
  `mens-centre`, `youth`, `addiction`, `directory`, `public-service`
- `region`: NZ region, or `National`
- `city`: city or service area
- `address`: public address, if available
- `phone`: public phone number, digits preferred
- `text`: public text/SMS number, if available
- `email`: public professional email, if available
- `website`: official website or trusted directory listing
- `hours`: contact hours or access notes
- `cost`: free, funded, private, public service, or varies
- `tags`: search and matching tags such as `depression`, `anxiety`, `trauma`,
  `cost`, `male`, `rangatahi`, `same-day`, `privacy`
- `fit`: plain-language description of who this is good for
- `firstStep`: the smallest action a user can take
- `source`: URL used to verify the listing
- `verified`: month verified, formatted `YYYY-MM`

## Import Rule

If a listing is only a directory and not a direct provider, mark `type` as
`directory`. Direct contact details are more useful, but directories are still
valuable when they help users find fit, cost, culture, or availability.
