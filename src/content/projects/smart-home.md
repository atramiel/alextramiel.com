---
title: Smart home
summary: A house run on Home Assistant, Node-RED and UniFi, with local control wherever I can get it.
group: Home and shop
years: Ongoing
tools: [Home Assistant, Node-RED, UniFi Network and Protect, Zigbee2MQTT, Inovelli switches, Matter]
links:
  - label: ha-unifi-eav on GitHub
    url: https://github.com/atramiel/ha-unifi-eav
order: 60
---

My house runs on Home Assistant and Node-RED on top of a large UniFi network. The rule I try to hold to is local control over cloud control: if the internet goes down, the lights and the garage should still work.

## What it does

The goal is for every room to have a smart switch, a temperature and humidity sensor, a door sensor, and a smart blind where one makes sense. I track coverage room by room.

The automations I like best handle chores. Vibration and door sensors on the washer, dryer and dishwasher work out whether a load is running, finished or forgotten, and nag only when something has sat too long. Another checks that the bins made it to the curb the night before pickup.

## Rules for anything that can cause damage

Automations that act on the house need manners. A leak can shut the water off, but only after a notification I can dismiss, followed by a second alert when the valve closes with a way to turn it back on. A low battery never shuts anything off.

## Buttons

A UniFi key fob sends webhooks that Home Assistant turns into a single event carrying the button and the press type: single, double or long. Any automation can listen for that one event.

## Building what's missing

When an integration doesn't exist I build it. I'm writing a Home Assistant integration for UniFi EAV Bridges in a public repository.

I also use Claude connected to Home Assistant and UniFi to write, debug and tidy automations.
