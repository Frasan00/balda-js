# Framework-bello

### Properties

#### Response types

- Responses based on textual methods es. response.internalServerError()

#### Automated cruds for given models

- With possibility of seasoning for the base cruds

#### Required tsconfig
"emitDecoratorMetadata": true,
"experimentalDecorators": true,

#### Parse between typescript interfaces and typeorm models

- Avoids the need to specify with decorators column types

index GET / [() => {}]? Auth? seasonHook => (req, res) => {}?
show GET /:id
POST /
PATCH /:id
DELETE /:id

GET /cards/user () => {} [() => {}]
