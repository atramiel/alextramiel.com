---
title: RC ground robot
summary: A remote-controlled ground vehicle built from FTC parts, a Raspberry Pi and a hobby radio.
group: Robots
role: Designer and builder
tools: [Raspberry Pi, goBILDA motor controller, FlySky transmitter, Python with pigpio, Onshape]
order: 50
---

This one is a remote-controlled ground vehicle built from FIRST Tech Challenge parts, with a Raspberry Pi as the brain, a goBILDA motor controller and a FlySky RC transmitter.

## Reading the radio

The receiver outputs a PPM signal, which packs every channel into one stream of pulses. I decode it in Python with the pigpio library and turn stick positions into motor commands.

## Sheet metal

The chassis parts are sheet metal designed in Onshape. Along the way I worked out a mirroring workflow for left and right parts, and how much thread engagement a 10-32 fastener needs.
