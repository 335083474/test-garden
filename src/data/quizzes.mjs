import {funQuizzes} from './fun-quizzes.mjs';
const profile = (name, tagline, summary, strengths, stretch, practice, conversation) => ({ name, tagline, summary, strengths, stretch, practice, conversation });
const question = (id, prompt, answers) => ({ id, prompt, answers: answers.map(([profile, text], i) => ({id:`${id}-${i+1}`, profile, text})) });
const makeQuestions = (slug, rows) => rows.map(([prompt, choices], i) => {
  // Rotate the original choice order to avoid putting the same style in the same position.
  const offset=i%choices.length;
  return question(`${slug}-${i+1}`, prompt, [...choices.slice(offset), ...choices.slice(0, offset)]);
});
export const quizzes = [
 {
  id:'communication-style', version:'1.0.0', category:'Communication', color:'rose', art:'conversation',
  title:'Communication style quiz', shortTitle:'How do you connect?',
  seoTitle:'Free Communication Style Quiz — Results & Practical Tips',
  description:'Explore how you explain, listen, connect, and move a conversation forward. Get a free result with one practical thing to try.',
  intro:'Your words have a rhythm. Find yours.',
  definition:'This free communication style quiz explores four everyday conversation preferences: getting to the point, asking for clarity, making space for people, and sparking ideas. It uses 12 original situations and shows your full basic result immediately, without an account.',
  purpose:'An original self-reflection quiz, not a validated psychological assessment. Your choices can change with the situation.',
  dimensions:['Directness','Clarity','Connection','Possibility'],
  profiles:{
   anchor:profile('The Anchor','You help a conversation land.','You often bring a conversation back to its purpose. A clear request or next step feels more useful to you than leaving everyone guessing.',['Clear requests','Decisive next steps'],'Moving quickly can leave a quieter person behind.','Before you propose the next step, ask: “Is there anything I have missed?”','When has getting to the point helped our friendship?'),
   clarifier:profile('The Clarifier','You make room for the right question.','You often look for context before responding. You like to understand what someone means, rather than solve the wrong problem quickly.',['Thoughtful questions','Shared understanding'],'More detail is not always what someone needs in an emotional moment.','Try: “Would you like me to help figure this out, or just listen?”','When do my questions feel helpful, and when do they feel like too much?'),
   connector:profile('The Connector','You notice the person behind the words.','You often pay attention to how a conversation feels. You make space for people and try to help them feel heard before moving to a solution.',['Careful listening','Welcoming others'],'Keeping things comfortable can make an honest request harder to say.','Pair warmth with a clear need: “I care about this, and I need a little more time.”','What helps each of us feel heard?'),
   catalyst:profile('The Catalyst','You open a new direction.','You often bring possibilities into a conversation. An example, a fresh connection, or a different approach can help you think out loud.',['Fresh perspectives','Inviting possibilities'],'New ideas can arrive before everyone is ready to move on.','After suggesting an idea, pause and ask: “Does that fit what you meant?”','Which of our conversations led somewhere unexpected?'),
  },
  questions:makeQuestions('communication',[
   ['A friend asks what you think of a plan. You tend to…', [['anchor','Say what you would do next.'],['clarifier','Ask what the plan needs to achieve.'],['connector','Ask how they feel about it.'],['catalyst','Suggest another possibility to explore.']]],
   ['A group chat is going in circles. You are most likely to…', [['anchor','Summarize the decision we need to make.'],['clarifier','Ask which part is still unclear.'],['connector','Invite the people who have not spoken.'],['catalyst','Try a different way of looking at it.']]],
   ['Someone gives you vague feedback. Your first response is…', [['anchor','“What would you like me to change?”'],['clarifier','“Can you give me a specific example?”'],['connector','“How did that affect you?”'],['catalyst','“Could we try a different approach?”']]],
   ['When explaining something unfamiliar, you start with…', [['anchor','The main point and what it means.'],['clarifier','A little context and a careful definition.'],['connector','What the other person already knows.'],['catalyst','An analogy or an interesting example.']]],
   ['A conversation gets tense. You often…', [['anchor','Name the issue we need to resolve.'],['clarifier','Check whether we understood each other.'],['connector','Acknowledge how everyone is feeling.'],['catalyst','Suggest a fresh starting point.']]],
   ['You need to turn down an invitation. You prefer to…', [['anchor','Give a kind, clear no.'],['clarifier','Explain the scheduling conflict.'],['connector','Make sure they know you appreciate being asked.'],['catalyst','Suggest something different to do together.']]],
   ['What makes a conversation feel useful to you?', [['anchor','We know what happens next.'],['clarifier','We understand the situation better.'],['connector','We feel more comfortable with each other.'],['catalyst','We leave with a new idea.']]],
   ['Someone tells you about a difficult day. You tend to…', [['anchor','Offer help with the next practical step.'],['clarifier','Ask what happened before making suggestions.'],['connector','Listen and let them finish.'],['catalyst','Help them imagine a different tomorrow.']]],
   ['In a new group, your natural contribution is…', [['anchor','Getting us started.'],['clarifier','Asking the question others may be wondering about.'],['connector','Helping people feel included.'],['catalyst','Bringing energy and a new topic.']]],
   ['Before sending an important message, you check that…', [['anchor','The request is easy to find.'],['clarifier','The details are accurate.'],['connector','The tone feels considerate.'],['catalyst','It communicates the bigger possibility.']]],
   ['When you disagree with a friend, you usually begin with…', [['anchor','A clear statement of your view.'],['clarifier','A question about how they reached their view.'],['connector','Something you can both agree on.'],['catalyst','An alternative that neither of you has tried.']]],
   ['At the end of a long discussion, you like to…', [['anchor','Confirm the next step.'],['clarifier','Recap what we learned.'],['connector','Check that everyone had a say.'],['catalyst','Name something exciting to explore next.']]],
  ]),
  faqs:[['Is the communication style quiz free?','Yes. All 12 questions, your style breakdown, and practical suggestions are free. No account or email is required.'],['Are these the four standard communication styles?','No. Anchor, Clarifier, Connector, and Catalyst are original editorial labels for this quiz. They do not reproduce a clinical scale or the passive/assertive/aggressive framework.'],['Can my communication style change?','Your answers may differ across relationships, situations, and time. Treat your result as a starting point for reflection, not a fixed identity.'],['How is this different from the work style quiz?','This quiz focuses on conversations. The work style quiz focuses on organizing tasks, collaboration, exploration, and finishing work.']],
 },
 {
  id:'animal-personality',version:'1.0.0',category:'Personality',color:'butter',art:'fox',
  title:'Animal personality test',shortTitle:'What animal is your energy?',
  seoTitle:'Animal Personality Test — What Animal Are You?',
  description:'A playful animal personality test with 12 everyday choices. Meet your animal, explore your mix, and compare with friends.',
  intro:'A little wild. A little you.',
  definition:'This animal personality test turns 12 everyday choices into a playful mix of four animal metaphors: Fox, Owl, Otter, and Bear. The full result is free and includes an illustrated card you can save on your device.',
  purpose:'Made for fun and conversation. Animal matches are original metaphors, not scientific personality types.',
  dimensions:['Exploration','Observation','Togetherness','Steadiness'],
  profiles:{
   fox:profile('The Fox','Curiosity takes the lead.','You often choose a new route, an experiment, or a little surprise. The Fox is our metaphor for the part of you that enjoys finding out what might happen.',['Trying something new','Spotting possibilities'],'Constant novelty can leave a good idea unfinished.','Give one new idea a small finish line today.','What is something new we should try together?'),
   owl:profile('The Owl','You see a little deeper.','You often pause to look, learn, and make sense of things. The Owl is our metaphor for taking a thoughtful moment before choosing your next move.',['Noticing details','Thinking things through'],'Waiting for every detail can make a small choice feel bigger than it is.','Pick one low-stakes thing you can decide without more research.','What is something you noticed that the rest of us missed?'),
   otter:profile('The Otter','Good things are better together.','You often gravitate toward shared moments, playful company, and checking in. The Otter is our metaphor for the part of you that brings people into the picture.',['Bringing people together','Making ordinary moments fun'],'You can enjoy company and still need time that belongs to you.','Keep a small part of your day just for yourself.','What is a small moment together that you still remember?'),
   bear:profile('The Bear','You make space feel steady.','You often choose a comfortable rhythm, reliable help, and a place to settle. The Bear is our metaphor for the part of you that makes everyday life feel grounded.',['Showing up reliably','Creating a comfortable rhythm'],'A familiar routine can hide an opportunity to change something.','Change one small part of a familiar routine and see how it feels.','What makes a place feel like home to you?'),
  },
  questions:makeQuestions('animal',[
   ['A free afternoon appears. You would rather…', [['fox','Explore somewhere you have not been.'],['owl','Get absorbed in something interesting.'],['otter','See who is around for a little adventure.'],['bear','Settle into a favorite way to unwind.']]],
   ['You find an unfamiliar path on a walk. You…', [['fox','Take a turn and see where it leads.'],['owl','Look at the map and the surroundings first.'],['otter','Ask your companion if they want to try it.'],['bear','Save it for another day and enjoy the route you know.']]],
   ['On a group trip, you tend to be the one who…', [['fox','Suggests the unexpected stop.'],['owl','Finds the interesting detail about a place.'],['otter','Makes sure everyone is having a good time.'],['bear','Remembers the snacks and the way back.']]],
   ['A new hobby catches your eye. What draws you in?', [['fox','The chance to experiment.'],['owl','The chance to understand how it works.'],['otter','The people you could enjoy it with.'],['bear','The pleasure of building a regular practice.']]],
   ['Your ideal corner of a café has…', [['fox','A view of a street you want to explore.'],['owl','A quiet spot to read or observe.'],['otter','Enough space for friends to join.'],['bear','A comfortable seat and your favorite drink.']]],
   ['Something does not go to plan. You usually…', [['fox','Improvise another route.'],['owl','Pause and work out what changed.'],['otter','Check in with the people around you.'],['bear','Put the basics back in place.']]],
   ['You bring a small gift for a friend. It is likely to be…', [['fox','An unexpected find.'],['owl','Something connected to an interest they mentioned.'],['otter','Something you can enjoy together.'],['bear','Something comforting they will use often.']]],
   ['Which small pleasure sounds best right now?', [['fox','Trying a surprising new flavor.'],['owl','Finally understanding a little mystery.'],['otter','Laughing about something with a friend.'],['bear','Returning to a familiar cozy place.']]],
   ['When you enter a new place, you first notice…', [['fox','What there is to discover.'],['owl','The little details and how it is arranged.'],['otter','The people and the atmosphere.'],['bear','Where you could feel comfortable.']]],
   ['A friend suggests an impromptu evening out. You…', [['fox','Are curious to see what happens.'],['owl','Want to know a little about the plan.'],['otter','Are excited to spend time together.'],['bear','Check your energy and what tomorrow needs.']]],
   ['You are making a little space of your own. You add…', [['fox','Objects from places you have explored.'],['owl','Books or things that invite a closer look.'],['otter','Photos and room for a visitor.'],['bear','Soft textures and familiar favorites.']]],
   ['At the end of a good day, you like to remember…', [['fox','Something you had never done before.'],['owl','Something you learned or noticed.'],['otter','A moment you shared with someone.'],['bear','A simple thing that felt just right.']]],
  ]),
  faqs:[['What animal can I get?','The four original animal metaphors are Fox, Owl, Otter, and Bear. Your result also shows the share of your choices associated with every animal. Ties produce a mixed result.'],['Is this animal personality test scientific?','No. It is an original entertainment quiz. Animal metaphors can make a conversation fun, but they do not diagnose or establish personality traits.'],['Can I save my result?','Yes. You can download an illustrated result card or a text summary. Both are created in your browser. Sharing the quiz link does not upload your answers.'],['Can friends take it together?','Take it separately first, then compare your animal mixes. It is not a live multiplayer quiz, and there is no compatibility score.']],
 },
 {
  id:'work-style',version:'1.0.0',category:'Work & life',color:'sage',art:'work',
  title:'Work style quiz',shortTitle:'Find your working rhythm.',
  seoTitle:'Free Work Style Quiz — Understand How You Work',
  description:'Explore how you plan, collaborate, experiment, and finish. A free work style quiz with a practical next step for your day.',
  intro:'Good work starts with knowing your rhythm.',
  definition:'This free work style quiz explores your preferences for planning, collaboration, experimentation, and follow-through through 12 original work situations. Your result includes all four scores and one practical suggestion, with no sign-up.',
  purpose:'For personal reflection only. This original quiz is not validated for hiring, career matching, or predicting job performance.',
  dimensions:['Planning','Collaboration','Experimentation','Follow-through'],
  profiles:{
   architect:profile('The Architect','You give the work a shape.','You often start by making the goal, steps, and constraints clear. A workable structure helps you focus and makes the path easier to share.',['Making a useful plan','Seeing dependencies'],'A detailed plan can make it harder to begin before everything is known.','Write the smallest useful first step, then do it before refining the plan.','How much planning helps us before it starts slowing us down?'),
   collaborator:profile('The Collaborator','You make progress a shared thing.','You often think about who needs to be involved, what they know, and how to work together. Progress feels easier when the right people are connected.',['Inviting useful input','Connecting people and work'],'Not every small decision needs a group discussion.','Choose one decision you can make independently, then share the outcome clearly.','Which decisions should we make together, and which can we make alone?'),
   explorer:profile('The Explorer','You find out by trying.','You often prefer a small experiment to a long debate. A first version or a new approach helps you learn what is possible.',['Testing possibilities','Learning through action'],'Starting fresh can distract from a useful approach that already works.','Before a new experiment, write down what you want to learn and when to stop.','What is one small experiment we could try this week?'),
   finisher:profile('The Finisher','You turn progress into done.','You often notice what still needs to be checked, handed over, or completed. Making something usable matters as much to you as starting it.',['Following through','Making work ready to use'],'Polishing every detail can hide the point where the work is already useful.','Define “good enough to share” before the final round of polishing.','What does done look like for the thing we are working on?'),
  },
  questions:makeQuestions('work',[
   ['A new project lands on your desk. You first want to…', [['architect','Clarify the goal, steps, and constraints.'],['collaborator','Find out who should be involved.'],['explorer','Make a small first version.'],['finisher','Define what a finished result needs to include.']]],
   ['Your task list feels too full. You tend to…', [['architect','Reorder it by importance and dependencies.'],['collaborator','Coordinate priorities with the people involved.'],['explorer','Try a simpler way to tackle one item.'],['finisher','Close a nearly finished task to clear space.']]],
   ['A project has an uncertain requirement. You would rather…', [['architect','Write down the unknowns and assumptions.'],['collaborator','Discuss it with the person who will use the result.'],['explorer','Test a quick example to learn more.'],['finisher','Agree on a clear acceptance check.']]],
   ['In a team task, you naturally notice…', [['architect','Whether the steps fit together.'],['collaborator','Whether the right people have had input.'],['explorer','Whether another approach could work better.'],['finisher','Whether anything has fallen through a gap.']]],
   ['You have an uninterrupted hour. You prefer to…', [['architect','Map out a focused block of work.'],['collaborator','Prepare something that helps the team move forward.'],['explorer','Explore a promising idea hands-on.'],['finisher','Finish and send something that is almost ready.']]],
   ['A routine process feels slow. Your first instinct is to…', [['architect','Look at its steps and bottlenecks.'],['collaborator','Ask the people using it what gets in the way.'],['explorer','Try a small alternative.'],['finisher','Fix the recurring loose ends.']]],
   ['When a deadline moves closer, you focus on…', [['architect','Replanning the essential work.'],['collaborator','Keeping responsibilities aligned.'],['explorer','Finding a workable shortcut.'],['finisher','Getting the essential result ready to hand over.']]],
   ['Which part of a project feels most satisfying?', [['architect','Turning a vague idea into a clear plan.'],['collaborator','Seeing people solve something together.'],['explorer','Discovering a better way through a trial.'],['finisher','Putting the finished result into use.']]],
   ['You are handing a task to someone else. You emphasize…', [['architect','The context and the sequence.'],['collaborator','Who can help and when to check in.'],['explorer','What you tried and what they could test next.'],['finisher','What is complete and what remains to check.']]],
   ['A meeting needs your contribution. You bring…', [['architect','A simple outline of the problem.'],['collaborator','Questions that connect everyone’s input.'],['explorer','An example or prototype to react to.'],['finisher','A list of actions that need owners.']]],
   ['You are learning a new tool. You prefer to…', [['architect','Understand the main workflow first.'],['collaborator','Learn alongside someone and exchange tips.'],['explorer','Try things and see what happens.'],['finisher','Use it to complete a real, bounded task.']]],
   ['Before calling a project done, you want to know…', [['architect','That the outcome matches the original goal.'],['collaborator','That the people involved have what they need.'],['explorer','What the experiment taught us.'],['finisher','That the handover and final checks are complete.']]],
  ]),
  faqs:[['What does a work style quiz measure?','This quiz summarizes your choices about planning, collaboration, experimentation, and follow-through. It describes preferences within these questions, not your skill level or performance.'],['Is this a career test?','No. It does not match you to jobs, assess abilities, or predict career outcomes. It is a starting point for thinking about your day-to-day work.'],['Can an employer use this to assess candidates?','This original quiz has not been validated for employment selection. It is intended for voluntary personal reflection, not candidate assessment.'],['Will I get all my results for free?','Yes. Your style mix, explanation, and practical suggestion are free, with no account or email required.']],
 }
 ,...funQuizzes
];
