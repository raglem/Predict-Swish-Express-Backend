# Predict & Swish Backend

This repository contains the backend implementation for the Predict & Swish web application. The backend is responsible for handling API requests, managing and updating data, and providing necessary services to the frontend.

**Use the following credentials (username: "test_user", password: "mypassword") to test the deployed fullstack web app and interact with bots (e.g., remove from friend list, make predictions, create a league). [Access the web app here](https://predict-swish-react-frontend.vercel.app/).**

## Introduction

The Predict & Swish web application is a live NBA prediction web app, where users can see upcoming games, make predictions on the final score, and later view the accuracy of their predictions. The main feature of the app is allowing users to make predictions on final scores and having the app track and evaluate the accuracy of these predictions. Users can friend and form leagues with other users. Leagues tally users' predictions, so users can view the status of others' predictions and compete for the top spot in the league leaderboards, based on the accuracy of their prediction. Leagues offer a chat feature, where users can chat with others in the same league and discuss each upcoming game. Leagues can be formed in either "classic" or "team" mode. "Classic" mode tallies the predictions for all NBA games, while "team" mode only tracks the games of a specified team.

## Features

- RESTful API endpoints
- Database integration
- Authentication and authorization

## Technologies Used

- **Programming Language**: Node.js
- **Framework**: Express
- **Database**: Mongo DB

## API Documentation
### User Routes
| **Route**       | **Description**                                                                                                                                       | **Access** |
|------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|------------|
| **POST /register** | Registers a new user by accepting user details such as username and password. Validates the input, hashes the password, and stores the user information in the database. Returns a success message or an error if the registration fails. | Public     |
| **POST /login**    | Authenticates a user by verifying the provided email and password. If the credentials are valid, generates and returns a JSON Web Token (JWT) for session management. Returns an error if authentication fails. | Public     |

### Player Routes
Note: In the context of the Predict & Swish web app, a "player" refers to user attributes and behaviors such as sending friend requests, joining a league, and making predictions. Basically, a "player" function is designated as anything a user may do aside from authentication (username and password). Here, the player routes are limited to player-to-player interactions, such as friending. Joining a league and making a prediction are handled in subsequent routing.
| **Route**                   | **Description**                                                                                                  | **Access** | **Request Fields**               | **Response Fields**                                                                                     |
|-----------------------------|------------------------------------------------------------------------------------------------------------------|------------|-----------------------------------|---------------------------------------------------------------------------------------------------------|
| **GET /players**            | Retrieves the details of a specific player.                                                                     | Private    | None                              | `id`, `friendId`, `sent_requests`, `received_requests`                                                 |
| **POST /players/add-friend**| Sends a friend request to another player.                                                                       | Private    | `friendId`                        | None                                                                                                   |
| **PATCH /players/accept-friend** | Accepts a pending friend request from another player.                                                           | Private    | `friendId`                        | None                                                                                                   |
| **DELETE /players/delete-request** | Cancels a pending friend request sent to another player.                                                      | Private    | `friendId`                        | None                                                                                                   |
| **DELETE /players/delete-friend**  | Removes an existing friend from the user's friend list.                                                       | Private    | `friendId`                        | None                                                                                                   |
### League Routes
Note: a player can be associated with a league in three ways: member league, invited leagues, and requesting leagues. A member league is a league in which a player's predictions are being counted for and the player is on the leaderboards. An invited league is a league in which the league owner sent an invite to the player. A requesting league is a league in which the player sent a request to join the league.

| **Route**                        | **Description**                                                                                     | **Access** | **Request Fields**                                   | **Response Fields**                                                                                     |
|-----------------------------------|-----------------------------------------------------------------------------------------------------|------------|-----------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| **GET /leagues**                  | Retrieves all member leagues of the current user. Returns an array where each index contains the following fields. | Private    | None                                                | Array of objects <br> Object Fields: `id`, `owner`, `mode`, `team`, `member_players`, `requesting_players`, `invited_players` |
| **GET /leagues/invites**          | Retrieves all member_leagues, invited_leagues, and requesting_leagues for the current user. Returns an array where each index contains the invite details. | Private    | None                                                | `member_leagues`, `invited_leagues`, `requesting_leagues`                                               |
| **GET /leagues/:leagueId**        | Retrieves details of a specific league by its ID.                                                   | Private    | `leagueId`                                          | `id`, `owner`, `mode`, `team`, `member_players`, `requesting_players`, `invited_players`                 |
| **POST /leagues/create**          | Creates a new league with the provided details.                                                     | Private    | `name`, `mode`, `team` (optional for "team" mode)   | None                                                                                                    |
| **POST /leagues/add**             | Adds players to an existing league.                                                                 | Private    | `leagueId`, `players`                             | None                                                                                                    |
| **POST /leagues/request**         | Sends a join request to a league.                                                                   | Private    | `joinCode`                                          | None                                                                                                    |
| **PATCH /leagues/accept-invite**  | Accepts an invite to join a league.                                                                 | Private    | `leagueId`                                          | None                                                                                                    |
| **PATCH /leagues/accept-request** | Accepts a join request from a player to join a league.                                              | Private    | `leagueId`, `playerId`                              | None                                                                                                    |
| **DELETE /leagues/delete-player** | Removes a specific player from a league.                                                            | Private    | `leagueId`, `playerId`                              | None                                                                                                    |
| **DELETE /leagues/delete-current-player** | Removes the current user from a league.                                                          | Private    | `leagueId`                                          | None                                                                                                    |

### Prediction Routes
| **Route**         | **Description**                                                                                     | **Access** | **Request Fields**                                   | **Response Fields**                                                                                     |
|--------------------|-----------------------------------------------------------------------------------------------------|------------|-----------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| **GET /predictions** | Retrieves all predictions made by the current user.                                                | Private    | None                                                | `upcoming_predictions`, `recent_predictions` <br/> Prediction Fields: `id`, `date`, `status`, `away_team`, `home_team`, `away_team_score`, `home_team_score`, `leagues` <br/> Note: Predictions will be grouped based on date. Recent predictions will include actual final scores of each time and the user's accuracy score.          |
| **POST /predictions** | Submits a new prediction for a specific game.                                                     | Private    | `gameId`, `predictedScore`                          | None                                                      |

Note: POST, PATCH, UPDATE, and DELETE responses are marked as None but typically follow convention of { success, message }. In this app, these HTTP methods' responses aren't designed to return data typically.

## Internal Functions
### The following functions are not used for communication with the frontend but are important for interally updating the database. These functions are scheduled are in `server.js`<br/>
Note: For testing purposes, Predict & Swish is hosted on Vercel, a severless platform, so at the moment, the deployed web app only runs in response to HTTP requests. Scheduled jobs for updating the database don't work as intended through Vercel. Currently, a local computer handles scheduled internal jobs for updating the database, so this does not negatively affect live user demonstration with the Vercel deployment.
### Game Functions
#### [BALLDONTLIE_API](https://www.balldontlie.io): Real-time stats, player insights, and game analytics for developers, analysts, and sports enthusiasts.
The BALLDONTLIE_API is used in this project to retrieve upcoming NBA games and recent scores daily. 

| **Function**   | **Description**                                                                                     | **Parameters**         | **Implementation Details**                                                                                     |
|-------------------|-----------------------------------------------------------------------------------------------------|------------------------|---------------------------------------------------------------------------------------------------------------|
| **loadGames**     | Fetches upcoming NBA games from the BALLDONTLIE_API and stores them in the database.                | None                   | Makes an API call to BALLDONTLIE_API, parses the response, and inserts game data into the MongoDB database. The current free plan limits database calls and the size of each response; delays in loadGames can be attributed to waiting for the cooldown between requests.            |
| **updateGames**   | Updates the scores of recently completed games by fetching data from the BALLDONTLIE_API.           | None                   | Retrieves all games within the last week and games marked with status 'Pending' or 'Upcoming' in the MongoDB database. Subsequently queries BALLDONTLIE_API for status of each live game; if status is returned as 'Final', updates the database with final scores, and marks games as "Final". |
| **verifyGames**   | Verifies the existence of upcoming games, within the next week, in the database by cross-checking with the BALLDONTLIE_API.     | None                   | Queries for each specific game with a GET request to the balldontlie api. If api responnds with status code 404, the current game as well as any related prediction is deleted from the MongoDB database. This is ran daily in the case of NBA being canceled (especially during the playoffs due to elimination) |

### Prediction Functions
| **Function**   | **Description**                                                                                     | **Parameters**         | **Implementation Details**                                                                                     |
|-------------------|-----------------------------------------------------------------------------------------------------|------------------------|---------------------------------------------------------------------------------------------------------------|
| **updatePredictions**     | Update all predictions within the last week with status 'Submitted'               | None                   | Query all games with status 'Final'. For each game, query predictions within the MongoDB database within the last week with status 'Submitted'. Calculate the accuracy score and save the prediction with status 'Complete'.           |

### Bot Functions
| **Function**   | **Description**                                                                                     | **Parameters**         | **Implementation Details**                                                                                     |
|-------------------|-----------------------------------------------------------------------------------------------------|------------------------|---------------------------------------------------------------------------------------------------------------|
| **updateAllBots**     | Update all bots (bot1, bot2,..., bot9)             | None                   | For each bot, accept any friend request and league invite. In addition, retrieve all upcoming games, and for each game without a prediction from the current bot, create a prediction with a random prediction for the away team and home team score and save with status 'Submitted'          |