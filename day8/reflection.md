# Reflection

## The most difficult concept

The hardest concept for me was how a request really travels through a system, especially asynchronous code with async/await and later how a database stops two people buying the same seat. At first I could not see why the page did not freeze while fetch() waited, or why checking a seat and then updating it could still sell it twice. I overcame it by tracing one request at a time on paper, running small examples in the Console and the DevTools Network tab, and testing SQL on sqliteonline.com until I saw the second update change zero rows. Drawing each step made the ideas stick.

## What I would improve in my capstone

Based on the feedback I received, I would improve my explanation of trade-offs and my live demo. I would show the request in the Network tab when creating a note, so the audience can see the API working, and I would explain one trade-off more clearly, such as why caching makes reads fast but can show slightly old data. I would also practise my timing so that I finish within the limit.

## What I will learn next

Next I will learn to build a real backend with Node.js and Express, so my API design becomes working code, and then store QuickNotes in a PostgreSQL database for real users. After that I want to learn React and keep practising system design with The System Design Primer.

