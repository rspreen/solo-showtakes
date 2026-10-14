# All behaviour goes through an internal operations layer

Every action the site can perform ("create a production", "set a rating", "publish a review") is a method in one internal layer that sits between the web pages and the database. Pages never query or write the database directly. We chose this over letting Next.js pages talk to the database themselves, which is the framework's shorter path, because it lets whole scenarios be tested without a browser, keeps the rules in one place, and leaves us able to expose a public API or support a mobile app later.

The layer is not reachable over the network today; it is an internal boundary, not a service.
