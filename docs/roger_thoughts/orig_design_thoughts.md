##### Project Goal
- Create a commercial-grade public-use website allowing users to create personal accounts where they offer ratings and reviews of theatre shows and similar stage-oriented live performances.  
- The site works like a social network in that it enables users to "find" and "follow" other users so that they can read each other's reviews, be alerted when new reviews are made, and publish various lists for others to see publicly.
- This site will be to theatre what "letterboxd.com" is to movie ratings, and what "goodreads.com" is to book ratings.
- It should be architected so that it can be developed, run, and tested locally, but it will ultimately be hosted externally and publicly, with good standards of security and infrastructure safety.  For example, since this will clearly be a database-oriented application, there should be techniques for backup, revert, etc.
- The site will be free to use by the users, but will allow advertising by the producers of shows, and also possibly get referral income by having "buy ticket" buttons.

##### Concepts
1. Users
  - Users are any public consumers of the site. This site is browsable by the general public who might want to read reviews or see ratings, or just see which shows (productions) are playing in a particular geographic location.
  - We distinguish between the general public users ("visitors" or "guests"), versus users who have created an account ("members") and are logged in and thus identified and capable of providing ratings and reviews.
  - When any "visitor"" (not yet identified as a Member) enters the site, there will be the typical "Already a member? Log in here" button to be convenient for Members, and a "sign up for free" button to encourage Visitors to become members.
  - When a user is not logged in, and is thus a "visitor", they can query and browse for shows and see reviews and ratings. This site is not a walled garden, and it is meant to encourage visitors to become members.
  - Account Creation process
    - the Account Creation process will first require an email address, with validation of that email address before proceeding to create the account.
    - once validated, the login process will require a password be defined by the user.
    - once validated, the login process will require a unique "handle" (username) be defined by the user. This "handle" works the same way as an instagram username/handle:
      - min length of 2, max length of 30, with letters, numbers, periods, and underscores only (must start with a letter or number.
      - always converted to lowercase
      - cannot have consecutive periods
      - must be unique across our site
      - same rules as instagram for changing the handle: 
        - can change only twice within a 14-day period, and when you change it, we will hold that old handle for you for 14 days so that you have that long to decide to change back.
    - the user can enter optional profile information:
      - a non-unique **"display name"**, similar to instagram's display name.
        - this name is shown on your profile
        - typically it is a user's first and last name, but it can be any characters, spaces, emojis, special characters with a max length of 30.
        - like instagram, you are limited to changing it twice within a 14-day window.
      - a short "bio" paragraph for them to express who they are.
      - a displayable image as an icon for their account.
      - Location (city, country). This is just for information to other members.
      - default "replies allowed by" setting, which says who can post public replies to your reviews, which is one of {anyone, members you follow, just you}.  We want to encourage people to post replies and create conversations/discussions, and it needs to be controllable for each individual review.
2. Following
  - A Member can "follow" any other member.  Thus, it is a one-to-N join of members.  When you "follow" another member, you will see that "followed" member's activity (ratings, reviews, comments) in a separate list so that you can quickly see what they've done.
  - A major function of the site is to present the activity of other members you are following, and to always display their reviews, ratings, and lists where possible to keep you connected to those other members.  This is typical social media connection.
  - Note that "following" is a one-way process, not two-way; it does not require mutual acceptance from the member being followed (which is sometimes called a "friend" relationship in other sites). 
  - Of course, two members can end up following each other, in which they both have a one-way following relationship to the other.  Thus they are mutually connected, but it is not inherently a two-way binding like a "friend". They can each stop following the other at any time without affecting the other.
  - In the future, we may offer special features where there is a "mutual" connection (two members following each other). Thus, we could have benefits of being two-way-connected "friends" without an explicit "Friend" relationship separate from following.
3. Blocking
  - Members can "block" other members.  This is a technique for preventing harassment.  When I block another member, these things happen:
    - the blocked member is removed from my "following" list
    - I am removed from the blocked member's "following" list (if they were following)
    - Any interactions they placed in my activity (comments or likes on my reviews, etc.) will be removed from everyone's view.
    - They will still be able to view my activity, just like any visitor can, but they cannot interact in any way (just like a visitor cannot either).
3. Shows
  - We must be careful with this terminology, depending if we are talking "internal architecture" versus "user interface".  To the users of this site, the word "show" is an informal, flexible word that can mean either a work of art, or a specific production of that work, or even a specific peformance as part of that production.  For marketing reasons, the word "show" is a common one; when people visit a city, they talk about seeing "a show". It is also an easy term to remember when looking for our product, and we already have a domain name "showtakes.com". When searching our site, we would ask people to "search for a show".
  - However, internally, we must distinguish the "work of art" from the "production" from the "performance".  Let's define:
    - **"work"**: the written piece of art conceived by the original author/composer/creator. When users search for a "show", this is what they are often thinking of in general.
    - **"production"**: this is a specific physical realization of the work, created by a unique team, that generates one or more specific performances of the work. This could also be called a "staging". The span of time that this series of performances covers is called the "run". This is the concept that our site will actually be providing interactions (reviews, ratings) on.
    - **"performance"**: a single, specific instance of a production presenting the work to a single audience at a specific location and time.
  - An example of this distinction is: Shakespeare's "Hamlet" is a "work".  In 2026 the Royal Shakespeare Company produced a "production" of Hamlet that included multiple "performances" across various cities in England, with the "run" lasting from February 28, 2026 to April 25, 2026.   
  - The goal of this website is to allow ratings, reviews, and interactions centered on **productions**.  
  - Typically a "show" represents a work of theatre, but this term can also include concerts, comedy shows, and other stage-oriented performances.  We will let our users broaden the use of the site if they find it desirable.
  - Some shows have a single physical location, like a Broadway Musical that stays in one theatre. However, other shows can be classified as "touring" where they perform in different locations on different dates. We want to connect all these performances so that users can make queries like "what are ratings of musicals that have performances in New York City in November."
  - There is an issue of how to create a data record for a "show" - who is authorized to enter or edit them.  Should users be allowed to enter them unvetted?  There are major websites where such information can be culled (and we will create internal tools to do for ourselves, to help populate this site) and eventually perhaps producers would want to have their accounts on our site be designated as official "show producers" who are authorized to do that, and who take responsibility for the meta information on that show.  For shows that occurred in the past, where there are no longer active producers, we might provide certain members with special authorization to be able to create show entries. 
  - Shows have various data fields:
    - title (mandatory)
    - graphic icon (optional)
    - producer name (optional)
    - General dates: the year or month range the show occurred, or when the show is running.  (mandatory) This allows us to represent shows in the past people can submit so that they can review them, without having specific details of past performance dates.  Shows can be permanent/ongoing.
    - Specific Locations and dates (optional).  Some shows (like Broadway shows) have a single location and a list of dates.  Touring shows and acts have a list of locations and corresponding dates.  In both cases, locations and dates are optional, but the more details we have, the better, if we can get them.
    - show website url (optional)
    - show owner/editors (users authorized to edit the show information, if any)
    - audit record of changes to the show records (perhaps an advanced feature, not needed initially)
    - Cast (optional): if the show has a cast, this will be a list of the cast and their roles.  This will allow people to browse from one show to a cast member's other appearances in other shows.
    - short description (optional)
4. Ratings
  - Every member can select any show (specifically, a **production** of a show) and optionally apply a rating to that production. There is an argument for enbabling members  to rate every performance, but I believe that does not serve users as well, as it dives into too much detail.  It also makes an average score for a production not as meaningful.  If someone sees multiple performances, they can discuss that in their reviews. I believe the purpose of this site is for theatre-lovers to express their opinions about productions.
  -   Ratings appears as a "5-star" scale, including half-steps, so it can be set between 0.5 and 5 stars. A "zero" rating means it is not rated. (We may not choose to store a zero, but from a user-interface perspective we might show zero stars to indicate to the member they haven't offered a rating yet.)  Thus, internally ratings are an integer setting from 1 to 10, but they are publicly displayed using iconography of stars and a decimal score from 0 to 5 (since, with averages, it can be a fractional decimal value).  
  - A rating is essentially an inner join between the member table and the production table. 
  - Ratings for a production are displayed as a small graphic including the numeric average (0 to 5), the representative number of stars, and possibly a bar graph to display the distribution of ratings.
  5. Reviews
  - Every member can select any production and optionally post a review of that production, which is freeform text paragraphs.  Conceptually there is no length limit, though there may be a practical limit to be imposed (such as goodreads that limits reviews to 15,000 characters).  When displayed to others, typically it will be the first few lines and a "more" button to expand it, so that users can see a list of reviews and expand the ones they want.
  - When a member creates a review, they can save it in "draft" form before officially "publishing" it and letting other visitors to the site see it.  They can also take down a review, saving it in a hidden (not published) state.  So there is "draft" (hidden from everyone), "published" (visible to everyone), and "hidden" (hidden from everyone). In all 3 states, it is still editable by the author.
  - Much of the success of this site will depend upon members interacting with other members' reviews.  The way they interact with reviews is to either "like" or "comment" on the review.
  - Likes
    - A "like" is a boolean "thumbs up", and can be turned on or off at any time. Thus, a "like" is an inner join between the member table and the reviews table.
    - Likes are important in helping users find highly-valued reviews, and to help distinguish members whose reviews are deemed valuable by others.  We will tend to sort much-liked reviews higher than others.
    - The "like" button (or more accurately, the like toggle switch) is available to any member except those that have been "blocked" by the review author.
    - The total number of likes is displayed on the review as well.
  - Comments
    - If authorized to do so, Members can create a discussion around a review by adding a **comment*** to that review
    - Authorized members can add additional comments, and each comment will be appended to a single, flat list of comments attached to that review.  
    - Comments cannot have sub-comments, i.e., there are not multiple threads. 
    - To establish authorization for commenting, each review has a "who can reply or comment" setting which initially comes from the member's account profile settings, but it can be changed at any time. 
    - To limit harassment and contention on the site, the owner/author of the review can delete individual comments.  They can also "report" comments to the site administrator.
  - The display of reviews for a production will be sortable. Typically it is by "most liked", but it may also be by "most followed reviewers", i.e. members who have the most people following them.  Or it may be "most recent".
6. Lists
  - members can create lists of specific works or productions that they like, with any title they like.  This lets them create things like "best shows of this year", or "things to see in my city," or "my favorite shows" etc.

##### other member features
- Once logged in, the member can:
  - Edit their profile
  - View the list of reviews they have written (sortable in different ways, such as by show, or by date written, or by most recently commented on, etc.)

##### User interface
- This is intended to be used by people who have used similar sites for reviews, so they will understand the concepts already, but they are not highly technical, and this site is meant to be fun, colorful, and joyous to use.  
- The site celebrates joyous works of art.
- The home page will be similar in functionality to letterboxd.  If not yet logged in, the home page has:
  - ability to "sign in"
  - ability to "create an account"
  - different groupings of shows sorted in different ways, to encourage browsing them
  - Various "browse by" options (popular, rating, location, genre, etc.)
- If already logged in (and we do want to be cookied to stay logged in between invocations of the home page)
  - ability to "sign out"
  - 
- It should be very easy to understand visually without having to study the page or read lots of text.
- Visually it needs to accomodate the graphic icons for each show, which we are not in control of, and which vary widely in color so we will need to frame or separate them to avoid too much visual clutter.
- In determining a user interface, we want to think about the different tasks a user might want to accomplish when they first visit the home page. Some examples:
  - "i want to see what people think of a specific show"
  - "i want to see what the most highly-rated shows are playing near me"
  - "I want to write a review"
  - "I want to see if there are any new reviews or comments by members I follow".

#### Administration
- The site needs administration abilities as well.  Initially these are basic data object editing abilities, so that we can play with the site and try things.
- We need a testing strategy so that the site's abilities can be tested for basic functionality before a new release is pushed out.
- Initial administration abilities would be:
  - create a show
  - create/edit/remove a user without going through the interative validation process
  - 
- 
##### Phase of development
- This site will be built incrementally, with an agreed-upon list (and order) of job tickets.
- We need to maintain a simple task document that lists current and future tasks, both for keeping track of all the ideas that we cannot build simultaneously, and which I can use to prioritize the order of development work as the site evolves.
- The initial goal is to be able to operate and test the basics with a minimal, invited-only set of members who will help test the site and help refine a user interface.
- Minimum viable functionality is:
  - Ability to create a new account (with email validation)
  - Ability to create and edit a show.
  - ability to create and edit basic profile info
  - View a list of shows, without respect to location (say, by "most recently reviewed" or "most recently added")
  - search for shows by name
  - Write a review attached to a show.
  - Set a rating for a show.
  - Operate a "like" button on someone else's review.
  - Comment on someone else's review.
  - Concept of "roles" or "authorizations" for a member, specifically as a "producer" who can create shows.
- Future features (not prioritized)
  - "forgot password" assistance
  - list of "popular reviews this week"
  - separate applications to scrape other websites for shows and related information (to increase our inventory of shows).
