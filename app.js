const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'cricketMatchDetails.db')
let db = null

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const convertDbObjToResponseObj = dbObject => ({
  playerId: dbObject.player_id,
  playerName: dbObject.player_name,
})

app.get('/players/', async (request, response) => {
  const getAllPlayers = `
    select * from player_details
    order by player_id`
  const playersArray = await db.all(getAllPlayers)
  console.log("Players details retrieved...")
  response.send(playersArray.map(players => convertDbObjToResponseObj(players)))
})

app.get('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const getPlayer = `
    select * from player_details
    where player_id=${playerId}`
  const player = await db.get(getPlayer)
  const {player_id, player_name} = player
  response.send({
    playerId: player_id,
    playerName: player_name,
  })
})

app.put('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const getBody = request.body
  const {playerName} = getBody
  const updatePlayer = `
    update player_details
    set player_name='${playerName}'
    where player_id=${playerId}`
  await db.run(updatePlayer)
  response.send('Player Details Updated')
})

app.get('/matches/:matchId/', async (request, response) => {
  const {matchId} = request.params
  const matchDetails = `
  select * from match_details
  where match_id=${matchId}`
  const details = await db.get(matchDetails)
  const {match_id, match, year} = details
  const dbResponse = {
    matchId: match_id,
    match: match,
    year: year,
  }
  response.send(dbResponse)
})

const convertObjToResponseObj = dbObj => ({
  matchId: dbObj.match_id,
  match: dbObj.match,
  year: dbObj.year,
})

app.get('/players/:playerId/matches', async (request, response) => {
  const {playerId} = request.params
  const matchesOfAPlayer = `
  select * from player_match_score natural join match_details
  where player_id=${playerId}`
  const players = await db.all(matchesOfAPlayer)
  response.send(players.map(ecahPlayer => convertObjToResponseObj(ecahPlayer)))
})

const convertDBObjToResponseObj = dbObject => ({
  playerId: dbObject.player_id,
  playerName: dbObject.player_name,
})
app.get('/matches/:matchId/players', async (request, response) => {
  const {matchId} = request.params
  const getMatchPlayersQuery = `
	    SELECT
	      player_details.player_id AS playerId,
	      player_details.player_name AS playerName
	    FROM player_match_score NATURAL JOIN player_details
        WHERE match_id=${matchId};`
  const player = await db.all(getMatchPlayersQuery)
  response.send(player)
})

app.get('/players/:playerId/playerScores', async (request, response) => {
  const {playerId} = request.params
  const getPlayerScored = `
    SELECT
    player_details.player_id AS playerId,
    player_details.player_name AS playerName,
    SUM(player_match_score.score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes FROM 
    player_details INNER JOIN player_match_score ON
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};
    `
  const player = await db.get(getPlayerScored)

  response.send({
    playerId: player.playerId,
    playerName: player.playerName,
    totalScore: player.totalScore,
    totalFours: player.totalFours,
    totalSixes: player.totalSixes,
  })
})

const PORT = 3000;
initializeDbAndServer().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}/`);
  });
});
