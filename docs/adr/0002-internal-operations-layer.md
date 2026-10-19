# All behaviour goes through an internal operations layer

Every action the site can perform ("create a production", "set a rating", "publish a review") is a method in one internal layer that sits between the web pages and the database. Pages never query or write the database directly. We chose this over letting Next.js pages talk to the database themselves, which is the framework's shorter path, because it lets whole scenarios be tested without a browser, keeps the rules in one place, and leaves us able to expose a public API or support a mobile app later.

The layer is not reachable over the network today; it is an internal boundary, not a service.

## Shape of an operation

- Every operation takes the acting party explicitly as its first argument: a Visitor, or a Member's id plus roles, built once per request from the login session. It does not take a fully loaded Member. (Scripts act as a third kind, the operator; see ADR 0007.)
- The things being acted on are passed as ids (`setRating(actor, productionId, stars)`), and the operation reads only what its rule needs.
- Each operation enforces its own permissions, so a page cannot bypass a rule by forgetting to check it.
- The database connection is passed in rather than imported, so tests run whole scenarios against a throwaway database.
- An automated lint rule fails any code in `src/core/` that imports Next.js, React, pages, or UI components. (Originally `src/domain/` and `src/operations/`; ADR 0004 replaced those with one folder per area.)
