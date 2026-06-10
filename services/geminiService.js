const { GoogleGenerativeAI } = require('@google/generative-ai');
const https = require('https');

const API_KEY = process.env.GEMINI_API_KEY;

// ─── PROMPT ────────────────────────────────────────────────────────────────
const ANALYSIS_PROMPT = (content) => `
You are ShadowSkills AI — an elite career intelligence engine. A user has answered a structured questionnaire about their experiences, projects, and work style. Analyze their responses and generate a precise, personalized skills profile.

IMPORTANT RULES FOR SKILL NAMES:
- Be SPECIFIC and CRISP. NOT "Communication" — instead "Cross-team Communication", "Technical Writing", "Stakeholder Presentations"
- NOT "Programming" — instead "Python (Data Analysis)", "React.js", "REST API Design"
- NOT "Leadership" — instead "Sprint Planning", "Event Coordination", "Team Mentoring"
- Infer skills from context. If they led a cricket team → "Sports Team Leadership", "Conflict Resolution Under Pressure"
- Every skill name must be 1-4 words, precise, and portfolio-worthy

USER QUESTIONNAIRE RESPONSES:
"""
${content}
"""

Return ONLY a valid JSON object (no markdown, no code fences, no explanation):
{
  "shadowScore": <number 0-100, honest overall capability score>,
  "personalityType": "<The [Adjective] [Archetype], e.g. The Strategic Builder, The Empathetic Innovator>",
  "personalityInsights": "<2-3 crisp sentences about their work style, how they think, and what drives them>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>", "<specific strength 4>", "<specific strength 5>"],
  "areasOfImprovement": ["<specific gap 1>", "<specific gap 2>", "<specific gap 3>"],
  "skills": {
    "technical": [
      { "name": "<crisp specific skill>", "level": <0-100> }
    ],
    "interpersonal": [
      { "name": "<crisp specific skill>", "level": <0-100> }
    ],
    "leadership": [
      { "name": "<crisp specific skill>", "level": <0-100> }
    ],
    "creative": [
      { "name": "<crisp specific skill>", "level": <0-100> }
    ],
    "problemSolving": [
      { "name": "<crisp specific skill>", "level": <0-100> }
    ]
  },
  "hiddenSkills": [
    {
      "name": "<skill they didn't mention but is clearly evident>",
      "level": <0-100>,
      "reason": "<one sentence: exactly why this was detected from their answer>"
    }
  ],
  "careerRecommendations": [
    {
      "title": "<Specific Job Title>",
      "match": <0-100>,
      "description": "<2 sentences: why this fits them specifically>",
      "industry": "<industry>",
      "salaryRange": "<realistic range for their region/level>",
      "requiredSkills": ["<skill1>", "<skill2>", "<skill3>"],
      "skillGaps": ["<gap1>", "<gap2>"],
      "growthRate": "<e.g. +22% over 5 years>"
    }
  ],
  "skillGapAnalysis": {
    "dreamCareer": "<their stated dream career>",
    "currentReadiness": <0-100>,
    "missingSkills": [
      { "name": "<specific missing skill>", "priority": "High|Medium|Low", "howToLearn": "<one specific resource or approach>" }
    ],
    "existingRelevantSkills": ["<skill they already have that applies to dream career>"],
    "timeToReady": "<honest estimate, e.g. 8-12 months with focused effort>"
  },
  "futureSelf": {
    "sixMonths": "<specific job title or role they could realistically reach>",
    "oneYear": "<specific job title or role>",
    "threeYears": "<aspirational but realistic title>"
  },
  "roadmap": {
    "threeMonth": [
      {
        "title": "<specific actionable goal>",
        "description": "<what to do, very specific>",
        "skills": ["<skill to build>"],
        "resources": ["<specific course/platform/book>"],
        "milestone": "<measurable outcome>"
      }
    ],
    "sixMonth": [
      {
        "title": "<specific goal>",
        "description": "<specific action>",
        "skills": ["<skill>"],
        "resources": ["<resource>"],
        "milestone": "<outcome>"
      }
    ],
    "oneYear": [
      {
        "title": "<specific goal>",
        "description": "<specific action>",
        "skills": ["<skill>"],
        "resources": ["<resource>"],
        "milestone": "<outcome>"
      }
    ]
  },
  "growthPrediction": "<2-3 sentences: honest, specific growth trajectory based on their actual profile>"
}

Include: 4-6 skills per category, 4-5 hidden skills, 5 career recommendations, 3 missing skills in gap analysis, 2-3 items per roadmap phase.
Make ALL content specific to THIS person's actual answers — no generic filler.
`;

// ─── METHOD 1: Google Generative AI SDK (v0.24+) ───────────────────────────
async function trySDK(prompt) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  // gemini-2.0-flash-lite has the highest free-tier RPM quota
  const models = [
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash'
  ];

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      console.log(`✅ Gemini SDK succeeded with model: ${modelName}`);
      return text;
    } catch (err) {
      console.warn(`⚠️  Model ${modelName} failed: ${err.message.substring(0, 120)}`);
    }
  }
  throw new Error('All SDK models failed');
}

// ─── METHOD 2: Direct HTTPS REST (v1beta) ─────────────────────────────────
async function tryREST(prompt, apiVersion = 'v1beta') {
  return new Promise((resolve, reject) => {
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    let attempted = 0;

    const tryModel = (modelName) => {
      const body = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
      });

      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/${apiVersion}/models/${modelName}:generateContent?key=${API_KEY}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              console.warn(`⚠️  REST ${apiVersion}/${modelName}: ${parsed.error.message}`);
              attempted++;
              if (attempted < models.length) {
                tryModel(models[attempted]);
              } else {
                reject(new Error(`REST ${apiVersion} all models failed: ${parsed.error.message}`));
              }
              return;
            }
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
            console.log(`✅ Gemini REST ${apiVersion}/${modelName} succeeded`);
            resolve(text);
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (err) => {
        attempted++;
        if (attempted < models.length) tryModel(models[attempted]);
        else reject(err);
      });
      req.setTimeout(25000, () => { req.destroy(); reject(new Error(`REST timeout on ${modelName}`)); });
      req.write(body);
      req.end();
    };

    tryModel(models[0]);
  });
}

// ─── MAIN FUNCTION ─────────────────────────────────────────────────────────
async function analyzeWithGemini(textContent) {
  const prompt = ANALYSIS_PROMPT(textContent.substring(0, 8000));
  let text = '';
  let usedMethod = '';

  // Try SDK first
  try {
    text = await trySDK(prompt);
    usedMethod = 'SDK';
  } catch (sdkErr) {
    console.warn('⚠️  SDK failed, trying REST v1beta...');
    // Try REST v1beta
    try {
      text = await tryREST(prompt, 'v1beta');
      usedMethod = 'REST-v1beta';
    } catch (restBetaErr) {
      console.warn('⚠️  REST v1beta failed, trying REST v1...');
      // Try REST v1
      try {
        text = await tryREST(prompt, 'v1');
        usedMethod = 'REST-v1';
      } catch (restErr) {
        console.error('❌ All Gemini methods failed. Using intelligent fallback.');
        console.error('   Last error:', restErr.message);
        return { success: false, data: generateMockAnalysis(textContent), error: restErr.message };
      }
    }
  }

  // Parse JSON from response
  try {
    // Clean up common response issues
    let cleaned = text.trim();
    // Remove markdown code fences if present
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in response');
    
    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`✅ Analysis complete via ${usedMethod}, Shadow Score: ${parsed.shadowScore}`);
    return { success: true, data: parsed };
  } catch (parseErr) {
    console.error('❌ JSON parse error:', parseErr.message);
    console.error('   Raw response (first 200 chars):', text?.substring(0, 200));
    return { success: false, data: generateMockAnalysis(textContent), error: parseErr.message };
  }
}

// ─── INTELLIGENT FALLBACK ──────────────────────────────────────────────────
function generateMockAnalysis(content) {
  const w = content.toLowerCase();
  const isTech   = /code|software|programming|developer|engineer|python|javascript|react|node|app|web/.test(w);
  const isDesign = /design|creative|art|ui|ux|figma|photoshop|illustrator|visual/.test(w);
  const isLeader = /lead|manage|team|director|captain|organiz|coordinat|club|event/.test(w);
  const isData   = /data|analysis|excel|sql|statistics|research|analytics|machine learning/.test(w);
  const isBiz    = /business|marketing|sales|finance|accounting|entrepreneur|startup/.test(w);
  const isSports = /sport|cricket|football|basketball|captain|player|tournament/.test(w);
  const isTeach  = /teach|mentor|tutor|explain|presentation|debate|coach/.test(w);
  const dreamMatch = w.match(/dream career[:\s]+([^\n.]+)/i);
  const dream = dreamMatch ? dreamMatch[1].trim() : (isTech ? 'Software Developer' : isDesign ? 'UX Designer' : isData ? 'Data Scientist' : 'Product Manager');
  let type = 'The Versatile Problem-Solver';
  if (isLeader && isTech) type = 'The Technical Visionary';
  else if (isLeader && isTeach) type = 'The Empathetic Leader';
  else if (isLeader) type = 'The Strategic Organizer';
  else if (isTech) type = 'The Analytical Builder';
  else if (isDesign) type = 'The Creative Architect';
  else if (isData) type = 'The Data-Driven Thinker';
  else if (isBiz) type = 'The Business Strategist';
  else if (isSports) type = 'The Competitive Team Player';
  const score = Math.floor(Math.random() * 18) + 68;
  return {
    shadowScore: score,
    personalityType: type,
    personalityInsights: `You demonstrate a natural ability to take initiative and follow through on commitments. Your approach blends structured thinking with creative flexibility, allowing you to navigate ambiguous situations effectively.`,
    strengths: [
      isLeader ? 'Taking ownership without being asked' : 'Self-directed execution',
      isTech ? 'Breaking complex problems into code' : 'Systematic problem decomposition',
      isTeach ? 'Explaining concepts with clarity' : 'Communicating ideas across contexts',
      'Continuous learning under pressure',
      isSports ? 'Performing under competitive pressure' : 'Staying focused on outcomes'
    ],
    areasOfImprovement: [
      'Building a public-facing portfolio',
      'Strategic professional networking',
      isLeader ? 'Delegating without micromanaging' : 'Stepping into leadership roles proactively'
    ],
    skills: {
      technical: isTech ? [
        { name: 'Python / JavaScript', level: 78 },
        { name: 'REST API Design', level: 68 },
        { name: 'Git & Version Control', level: 75 },
        { name: 'Database Design (SQL/NoSQL)', level: 64 },
        { name: 'System Architecture', level: 60 }
      ] : [
        { name: 'Digital Productivity Tools', level: 76 },
        { name: 'Research & Documentation', level: 74 },
        { name: 'Technical Writing', level: 68 },
        { name: 'Data-driven Decision Making', level: 66 },
        { name: 'Process Optimization', level: 63 }
      ],
      interpersonal: [
        { name: 'Cross-functional Communication', level: 81 },
        { name: 'Active Listening & Empathy', level: 84 },
        { name: 'Peer Collaboration', level: 79 },
        { name: isTeach ? 'Knowledge Transfer' : 'Stakeholder Communication', level: isTeach ? 82 : 72 },
        { name: 'Constructive Feedback Giving', level: 70 }
      ],
      leadership: isLeader ? [
        { name: 'Team Coordination', level: 80 },
        { name: 'Event / Project Planning', level: 78 },
        { name: isSports ? 'Sports Team Captaincy' : 'Group Decision-Making', level: 76 },
        { name: 'Conflict De-escalation', level: 69 },
        { name: 'Motivating & Energizing Teams', level: 74 }
      ] : [
        { name: 'Initiative-taking', level: 70 },
        { name: 'Self-directed Goal Setting', level: 72 },
        { name: 'Peer Influence', level: 63 },
        { name: 'Project Ownership', level: 68 },
        { name: 'Accountability', level: 75 }
      ],
      creative: isDesign ? [
        { name: 'UI / Visual Design', level: 82 },
        { name: 'Wireframing & Prototyping', level: 75 },
        { name: 'Brand Identity Thinking', level: 70 },
        { name: 'Design Thinking Process', level: 74 },
        { name: 'User-Centered Storytelling', level: 68 }
      ] : [
        { name: 'Creative Problem Framing', level: 72 },
        { name: 'Brainstorming & Ideation', level: 76 },
        { name: 'Content Structuring', level: 68 },
        { name: 'Narrative / Storytelling', level: 71 },
        { name: 'Lateral Thinking', level: 67 }
      ],
      problemSolving: [
        { name: 'Root Cause Analysis', level: 78 },
        { name: 'Logical Decomposition', level: 80 },
        { name: 'Research-first Approach', level: 75 },
        { name: 'Debugging Under Pressure', level: 72 },
        { name: 'Trade-off Evaluation', level: 68 }
      ]
    },
    hiddenSkills: [
      { name: 'Resilience Under Deadlines', level: 82, reason: 'Evident from how you described handling the project challenge without giving up' },
      { name: 'Self-regulation & Focus', level: 79, reason: 'Shown by your consistent learning hours and deliberate skill-building approach' },
      { name: isLeader ? 'Psychological Safety Creation' : 'Collaborative Intelligence', level: 76, reason: isLeader ? 'Teams you lead appear to feel safe expressing ideas' : 'You naturally elevate the people you work with' },
      { name: 'Rapid Contextual Learning', level: 81, reason: 'You pick up new domains quickly as evidenced by your cross-disciplinary interests' },
      { name: isSports ? 'Competitive Drive & Composure' : 'Grit & Persistence', level: 77, reason: isSports ? 'Sports competition translates directly into goal-oriented workplace behavior' : 'Your achievement story shows follow-through even when progress is slow' }
    ],
    careerRecommendations: [
      {
        title: isTech ? 'Full-Stack Developer' : isDesign ? 'Product Designer' : isData ? 'Data Analyst' : isBiz ? 'Product Manager' : 'Operations Manager',
        match: 88,
        description: 'Your combination of technical skills and problem-solving ability maps directly to this role. You can own problems end-to-end, which is exactly what hiring managers look for.',
        industry: isTech ? 'Technology' : isDesign ? 'Design / Product' : 'Business & Operations',
        salaryRange: 'Rs 6L-14L / year (Entry-Mid)',
        requiredSkills: isTech ? ['React.js or Node.js', 'REST APIs', 'Git'] : ['Problem Framing', 'Stakeholder Alignment', 'Roadmapping'],
        skillGaps: isTech ? ['Cloud Deployment (AWS/GCP)', 'System Design'] : ['SQL / Data Analysis', 'Agile Methodology'],
        growthRate: '+22% over 5 years'
      },
      {
        title: 'Product Manager (Associate)',
        match: 81,
        description: 'Your natural ability to see the big picture and coordinate across domains is a core PM trait. Leadership and communication experiences are exactly the foundation PMs need.',
        industry: 'Technology / SaaS',
        salaryRange: 'Rs 8L-18L / year',
        requiredSkills: ['User Research', 'Agile / Scrum', 'Product Roadmapping'],
        skillGaps: ['Quantitative Analysis', 'PRD Writing'],
        growthRate: '+18% over 5 years'
      },
      {
        title: 'Data Analyst',
        match: 75,
        description: 'Your research-first approach to problem-solving pairs well with data analysis work. Adding SQL and Python basics would make you immediately hireable.',
        industry: 'Analytics / BI',
        salaryRange: 'Rs 5L-12L / year',
        requiredSkills: ['SQL', 'Tableau / Power BI', 'Python (Pandas)'],
        skillGaps: ['Statistical Hypothesis Testing', 'A/B Testing Design'],
        growthRate: '+25% over 5 years'
      },
      {
        title: 'UX Researcher',
        match: 70,
        description: 'Your empathy and listening skills are the core of great UX research. This role values exactly the kind of human-centered thinking you demonstrate.',
        industry: 'Design / Product',
        salaryRange: 'Rs 6L-13L / year',
        requiredSkills: ['User Interviews', 'Usability Testing', 'Affinity Mapping'],
        skillGaps: ['Figma Basics', 'Research Report Writing'],
        growthRate: '+20% over 5 years'
      },
      {
        title: isLeader ? 'Program Coordinator' : 'Business Analyst',
        match: 65,
        description: 'Your organizational experience and systematic thinking make you well-suited for roles that bridge business and execution.',
        industry: 'Cross-industry',
        salaryRange: 'Rs 5L-10L / year',
        requiredSkills: ['Requirements Gathering', 'Process Mapping', 'Communication'],
        skillGaps: ['Business Process Modelling', 'JIRA / Confluence'],
        growthRate: '+12% over 5 years'
      }
    ],
    skillGapAnalysis: {
      dreamCareer: dream,
      currentReadiness: Math.floor(score * 0.55),
      missingSkills: [
        {
          name: isTech ? 'Cloud Platform (AWS/GCP/Azure)' : (isDesign ? 'Figma Prototyping' : 'Advanced SQL'),
          priority: 'High',
          howToLearn: isTech ? 'AWS Free Tier + A Cloud Guru (6-8 weeks)' : (isDesign ? 'Figma Basics on YouTube' : 'SQLZoo + Mode Analytics')
        },
        {
          name: isTech ? 'System Design Fundamentals' : (isDesign ? 'User Research Methods' : 'Product Strategy Frameworks'),
          priority: 'High',
          howToLearn: isTech ? 'Gaurav Sen YouTube + Grokking System Design' : (isDesign ? 'NNG Group articles + 5 user interviews' : 'Reforge blog + Inspired by Marty Cagan')
        },
        {
          name: 'Personal Portfolio / GitHub',
          priority: 'Medium',
          howToLearn: 'Build one project per month and publish - quality over quantity'
        }
      ],
      existingRelevantSkills: [
        isLeader ? 'Team coordination' : 'Self-directed execution',
        isTech ? 'Coding fundamentals' : 'Analytical thinking',
        isTeach ? 'Explaining concepts clearly' : 'Cross-functional communication'
      ],
      timeToReady: '6-10 months with consistent daily effort (1-2 hrs/day)'
    },
    futureSelf: {
      sixMonths:  isTech ? 'Junior Developer / Software Intern' : isDesign ? 'UI Design Intern'       : 'Business Analyst Intern',
      oneYear:    isTech ? 'Full-Stack Developer (Entry Level)' : isDesign ? 'Junior Product Designer' : 'Associate Product Manager',
      threeYears: isTech ? 'Senior Developer or Tech Lead'      : isDesign ? 'Senior UX Designer'      : 'Product Manager'
    },
    roadmap: {
      threeMonth: [
        {
          title: 'Close Your #1 Skill Gap',
          description: 'Pick the highest-priority missing skill and complete one structured course. Build one mini-project demonstrating it.',
          skills: [isTech ? 'Cloud Basics or System Design' : (isDesign ? 'Figma Prototyping' : 'SQL')],
          resources: [isTech ? 'AWS Free Tier + A Cloud Guru' : (isDesign ? 'Figma for Beginners (YouTube)' : 'SQLZoo + Mode Analytics')],
          milestone: 'Publish one working project or case study publicly'
        },
        {
          title: 'Build Your Online Presence',
          description: 'Create/update your LinkedIn profile, GitHub, and portfolio website with proper project descriptions.',
          skills: ['Personal branding', 'Technical writing', 'Storytelling'],
          resources: ['LinkedIn profile optimization guide', 'GitHub Pages for portfolio'],
          milestone: 'LinkedIn at 100% completeness + 3 project writeups live'
        }
      ],
      sixMonth: [
        {
          title: 'Ship a Real-World Project',
          description: 'Build something that solves a genuine problem. This is the single highest-value thing you can do.',
          skills: ['End-to-end project ownership', 'Problem identification', 'Shipping under constraints'],
          resources: ['Product Hunt for inspiration', 'GitHub + Netlify/Vercel for deployment'],
          milestone: 'One launched product/project with real users or feedback'
        },
        {
          title: 'Network with Purpose',
          description: 'Connect with 2-3 people working in your target role. Ask for informational interviews, not jobs.',
          skills: ['Professional networking', 'Interviewing skills', 'Industry knowledge'],
          resources: ['LinkedIn + cold outreach templates', 'Relevant Discord/Slack communities'],
          milestone: '3 informational interviews completed; 1 mentor relationship started'
        }
      ],
      oneYear: [
        {
          title: 'Apply for Target Roles or Internships',
          description: 'With a portfolio and real project, begin actively applying. Customize every application.',
          skills: ['Resume tailoring', 'Technical interview prep', 'Behavioral storytelling'],
          resources: ['NeetCode.io for DSA', 'Pramp for mock interviews', 'Levels.fyi for salary'],
          milestone: 'Minimum 3 final-round interviews; at least 1 offer in hand'
        },
        {
          title: 'Become Visible in Your Field',
          description: 'Write one article, give one talk, or contribute to open source. Visibility compounds fast.',
          skills: ['Thought leadership', 'Content creation', 'Community building'],
          resources: ['Medium / Hashnode for writing', 'dev.to for tech articles', 'local meetups'],
          milestone: '5+ articles published OR 1 open-source contribution merged'
        }
      ]
    },
    growthPrediction: `Based on your experience level and learning intensity, you are on track to be job-ready for entry-level ${dream} roles within 6-10 months of focused effort. Your ${isLeader ? 'leadership background gives you a strong soft-skills edge over purely technical candidates' : 'project experience already sets you apart from candidates with only academic credentials'}. Double down on building publicly visible work.`
  };
}

module.exports = { analyzeWithGemini };
