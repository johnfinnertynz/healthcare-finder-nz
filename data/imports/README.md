# Import Drop Folder

Place approved source exports here before running the refresh tools.

Suggested filenames:

- `healthpoint-provider-bundle.json` for an approved Healthpoint or HPI FHIR Bundle
- `gp-practices.csv` for an approved GP clinic export
- `care-providers.csv` for approved counsellor, psychologist, or psychiatrist contacts
- `mcnz-register.csv` for an approved Medical Council register export
- `psychologists-board-register.csv` for a Psychologists Board register export

Do not commit restricted source exports unless the data-sharing agreement allows
public redistribution.

The DoctorPricer GP importer does not need a file in this folder. It refreshes
the public GP clinic endpoint directly and writes normal `type: "gp"` provider
records into `providers.json`.
