# Showtakes

A public site where theatre-goers rate, review, and discuss productions of stage shows, and follow each other's opinions.

## Language

### Catalog

**Show**:
The informal, public-facing word for anything a person might go to see. It is deliberately loose and is used only in the user interface and marketing, never as a precise domain term.

**Work**:
The piece as conceived by its original creators, independent of any staging. One Work has many Productions. A Work has no Owner; only an Admin may change or merge Works.
_Avoid_: Show, title, piece

**Production**:
One creative team's staging of a Work with one company. Ratings and Reviews attach to Productions. A revival, a tour, and a replica staging in another city are each separate Productions; a transfer to a new venue with the same team is the same Production.
_Avoid_: Show, staging

**Engagement**:
A Production's stay in one City over a date range, optionally at a named Venue. A sit-down Production has one, a transfer has two, a tour has many. Engagements are optional detail on a Production, and their dates may be unknown.
_Avoid_: Run, stop, booking

**City**:
A place an Engagement happens in, chosen from a fixed reference list and never typed freely.
_Avoid_: Location, town

**Venue**:
A named place in one City where Engagements happen. An Engagement need not name one.
_Avoid_: Theatre, location, house

**Run**:
The whole span of time covered by a Production, across all of its Engagements.

**Performance**:
A single presentation of a Production to one audience at one place and time.

**Producer**:
The real-world person or organisation that staged a Production. Never a role on this site.

**Category**:
The broad kind of a Work: play, musical, opera, dance, comedy, concert, or other.
_Avoid_: Genre, type

### People

**Visitor**:
Anyone using the site without being logged in. A Visitor can browse and read but cannot interact.
_Avoid_: Guest, user, anonymous user

**Member**:
A person with an account who is logged in and identified.
_Avoid_: User, account holder

**Curator**:
A Member authorised to create and edit Works and Productions.
_Avoid_: Producer, editor

**Admin**:
A Member authorised to manage Members, roles, and any catalog entry, and to take down Reviews and Comments. A Member may be a Curator, an Admin, both, or neither.
_Avoid_: Moderator, superuser, staff

**Owner**:
The single Curator responsible for a Production's catalog entry and the only Member, apart from an Admin, who may edit it. The Curator who creates a Production is its first Owner.
_Avoid_: Editor, maintainer

**Follow**:
A one-way relationship in which one Member subscribes to another Member's activity. It needs no acceptance from the Member being followed.
_Avoid_: Friend, connection

**Block**:
A relationship one Member imposes on another that stops all interaction between the two in both directions and hides the blocked Member's content from the blocker. The blocked Member is not told.

### Opinions

**Rating**:
A Member's single score for a Production, from half a star to five stars in half-star steps. It stands alone and is not part of any Review, and it is publicly attributed to the Member.
_Avoid_: Score, stars

**Review**:
Freeform text a Member writes about a Production. A Member has at most one Review per Production, and a Review does not require a Rating.
_Avoid_: Take, post

**Draft**:
A Review its author has not yet published. Only the author can see it.

**Published**:
A Review visible to everyone.

**Withdrawn**:
A Review its author has taken down after publishing. Its Likes and Comments are kept and return if it is published again.
_Avoid_: Hidden, unpublished

**Removed**:
A Review or Comment taken down by an admin. The author cannot reverse it.
_Avoid_: Hidden, deleted

**Like**:
A Member's on-or-off endorsement of another Member's Review.
_Avoid_: Thumbs up, upvote

**Comment**:
A Member's response to a Review, held in one flat list on that Review.
_Avoid_: Reply, response
