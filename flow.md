# Chatbot Conversation Flow

## Rider booking

```text
Rider: Hi
Bot: Welcome. I can help you book a ride.
Bot: What is your full name?
Rider: John Smith
Bot: What is your pickup location?
Rider: LPIA Airport
Bot: What is your drop-off location?
Rider: Atlantis
Bot: What date and time do you need the ride?
Rider: Today 4:30 PM
Bot: How many passengers?
Rider: 2
Bot: What vehicle type?
Rider: SUV
Bot: Any special notes?
Rider: 2 bags
Bot: Please confirm...
Rider: YES
Bot: Your ride request has been sent to our drivers.
```

## Driver accepts

```text
Bot to drivers: New ride request. Press ACCEPT.
Driver 1: ACCEPT
Bot: You accepted this ride.
Bot to rider: Your ride has been accepted.
```

## ETA

```text
Rider: Request ETA
Bot to driver: The rider is asking for your ETA.
Driver: 7
Bot to rider: Your driver says they are about 7 minutes away.
```

## I'm outside

```text
Driver: I'm outside
Bot to rider: Your driver is outside.
```

## Ask question

```text
Driver: Are you at arrivals or departures?
Bot to rider: Message from your driver...
Rider: Arrivals
Bot to driver: Rider replied: Arrivals
```
