# Connections as the canonical external identity model

**Status: accepted.** `connections` is the canonical model for a user's linked external identity. The existing `oauth_accounts` concept will be folded into this model instead of keeping two parallel identity sources, because authentication and profile association already converge on the connection concept. GitHub is the only supported provider in the current scope; the model may retain a provider discriminator without expanding the feature scope.
