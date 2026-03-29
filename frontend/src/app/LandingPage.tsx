"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import s from "./landing.module.css";

export default function LandingPage() {
  const locale = useLocale();

  const handleToggleLocale = () => {
    const newLocale = locale === "en" ? "zh" : "en";
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;
    window.location.reload();
  };

  return (
    <div className={s.landingPage}>
      {/* ===== STICKY NAV ===== */}
      <nav className={s.stickyNav}>
        <div className={s.navBrand}>
          <span>&#9635;</span> Creator Hub
        </div>
        <div className={s.navActions}>
          <button onClick={handleToggleLocale} className={s.localeToggle}>
            <span className={locale === "en" ? s.localeActive : s.localeInactive}>
              &#127482;&#127480; EN
            </span>
            <span className={locale === "zh" ? s.localeActive : s.localeInactive}>
              &#127464;&#127475; ZH
            </span>
          </button>
          <Link href="/login" className={s.navBtnLogin}>Log In</Link>
          <Link href="/signup" className={s.navBtnSignup}>Sign Up</Link>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className={s.heroSection}>
        <div className={s.heroBgGlow} />
        <div className={s.heroContent}>
          <div className={s.heroBadge}>
            &#128640; Now Recruiting Creators
          </div>
          <h1 className={s.heroTitle}>
            Get Paid for Your AI Creative Skills
          </h1>
          <p className={s.heroSubtitle}>
            Join a community of creators who use AI tools to produce images, videos, voiceovers,
            and more — and earn real money doing it.
          </p>
          <div className={s.heroActions}>
            <a href="#how-it-works" className={s.btnPrimary}>
              &#9654; See How It Works
            </a>
            <a href="#get-started" className={s.btnSecondary}>
              &#9992; Apply Now
            </a>
          </div>
          <div className={s.heroStats}>
            <div className={s.statItem}>
              <div className={s.statNumber}>12+</div>
              <div className={s.statLabel}>Skill Channels</div>
            </div>
            <div className={s.statDivider} />
            <div className={s.statItem}>
              <div className={s.statNumber}>$$$</div>
              <div className={s.statLabel}>Monthly Payouts</div>
            </div>
            <div className={s.statDivider} />
            <div className={s.statItem}>
              <div className={s.statNumber}>100%</div>
              <div className={s.statLabel}>Remote</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHY HUMANS ===== */}
      <section className={s.contentSection}>
        <div className={s.sectionInner}>
          <div className={s.sectionLabel}>&#128101; The Human Advantage</div>
          <h2 className={s.sectionTitle}>
            AI Is Powerful. But It Still Needs <span className={s.gradientText}>You.</span>
          </h2>
          <p className={s.sectionDescription}>
            AI can generate images, write scripts, and produce videos at incredible speed.
            But it can&apos;t do any of this <em>well</em> without a human who knows what &ldquo;good&rdquo; looks like.
          </p>

          <div className={s.cardsGrid}>
            <div className={s.infoCard}>
              <div className={`${s.cardIcon} ${s.cardIconBlue}`}>&#129504;</div>
              <h3 className={s.infoCardTitle}>Directing the AI</h3>
              <p className={s.infoCardText}>
                Someone needs to craft the right prompt, choose the right tool, and iterate until the output
                is actually usable. That creative judgment is a skill — and it&apos;s yours.
              </p>
            </div>
            <div className={s.infoCard}>
              <div className={`${s.cardIcon} ${s.cardIconPurple}`}>&#9989;</div>
              <h3 className={s.infoCardTitle}>Quality Control</h3>
              <p className={s.infoCardText}>
                AI doesn&apos;t know when something looks &ldquo;off.&rdquo; Humans catch the awkward hand in a generated image,
                the factual error in a script, or the pacing issue in a video. You&apos;re the quality gate.
              </p>
            </div>
            <div className={s.infoCard}>
              <div className={`${s.cardIcon} ${s.cardIconGreen}`}>&#129513;</div>
              <h3 className={s.infoCardTitle}>Creative Assembly</h3>
              <p className={s.infoCardText}>
                Great content isn&apos;t just one asset — it&apos;s how pieces fit together. Choosing the right image
                for a scene, the right voice for a character, the right cut for a transition. That&apos;s human craft.
              </p>
            </div>
            <div className={s.infoCard}>
              <div className={`${s.cardIcon} ${s.cardIconOrange}`}>&#10084;</div>
              <h3 className={s.infoCardTitle}>Taste &amp; Judgment</h3>
              <p className={s.infoCardText}>
                AI generates options. You make decisions. Knowing what resonates with an audience,
                what feels authentic, and what tells a compelling story — that&apos;s irreplaceable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHY THIS IS EASIER ===== */}
      <section className={`${s.contentSection} ${s.altBg}`}>
        <div className={s.sectionInner}>
          <div className={s.sectionLabel}>&#9889; The Easier Path</div>
          <h2 className={s.sectionTitle}>
            Monetizing AI Skills Shouldn&apos;t Be <span className={s.gradientText}>This Hard</span>
          </h2>
          <p className={s.sectionDescription}>
            Right now, people with AI skills have two options — and both are brutal.
            We built a third way.
          </p>

          <div className={s.comparisonGrid}>
            <div className={`${s.comparisonCard} ${s.comparisonBad}`}>
              <div className={s.comparisonHeader}>
                <span className={s.comparisonBadIcon}>&#10060;</span>
                <h3 className={s.comparisonHeaderTitle}>Build an App</h3>
              </div>
              <ul className={s.comparisonList}>
                <li className={s.comparisonBadItem}>Months of development before earning anything</li>
                <li className={s.comparisonBadItem}>Need coding, marketing, and business skills</li>
                <li className={s.comparisonBadItem}>Getting users is the hardest part</li>
                <li className={s.comparisonBadItem}>Most apps fail — high risk, uncertain reward</li>
              </ul>
            </div>

            <div className={`${s.comparisonCard} ${s.comparisonBad}`}>
              <div className={s.comparisonHeader}>
                <span className={s.comparisonBadIcon}>&#10060;</span>
                <h3 className={s.comparisonHeaderTitle}>Build an AI Social Account</h3>
              </div>
              <ul className={s.comparisonList}>
                <li className={s.comparisonBadItem}>Months of posting with zero income</li>
                <li className={s.comparisonBadItem}>Algorithm changes can kill your reach overnight</li>
                <li className={s.comparisonBadItem}>Need to be entertaining AND consistent</li>
                <li className={s.comparisonBadItem}>Monetization requires massive following first</li>
              </ul>
            </div>

            <div className={`${s.comparisonCard} ${s.comparisonGood}`}>
              <div className={s.comparisonHeader}>
                <span className={s.comparisonGoodIcon}>&#9989;</span>
                <h3 className={s.comparisonHeaderTitle}>Creator Hub</h3>
              </div>
              <ul className={s.comparisonList}>
                <li className={s.comparisonGoodItem}>Clear tasks with set pay — you know what you&apos;ll earn</li>
                <li className={s.comparisonGoodItem}>Use skills you already have, no audience needed</li>
                <li className={s.comparisonGoodItem}>Start earning from your very first approved task</li>
                <li className={s.comparisonGoodItem}>Work when you want, on what you want</li>
              </ul>
            </div>
          </div>

          <div className={s.bottomCallout}>
            <span className={s.bottomCalloutIcon}>&#128161;</span>
            <div>
              <strong style={{ color: '#f2f3f5' }}>The difference?</strong> We removed the hardest part.
              You don&apos;t need to find customers, build a product, or grow an audience.
              Just do great creative work — and get paid for it.
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className={s.contentSection}>
        <div className={s.sectionInner}>
          <div className={s.sectionLabel}>&#128739; Step by Step</div>
          <h2 className={s.sectionTitle}>How It <span className={s.gradientText}>Works</span></h2>
          <p className={s.sectionDescription}>
            From application to your first payout — here&apos;s exactly what happens.
          </p>

          <div className={s.stepsTimeline}>
            <div className={s.stepItem}>
              <div className={s.stepNumber}>1</div>
              <div className={s.stepContent}>
                <h3 className={s.stepContentTitle}>Apply with a Quick Form</h3>
                <p className={s.stepContentText}>
                  Fill out a short Google Doc form. Tell us who you are, what you&apos;re good at, and what kind of
                  creative work excites you. No resume needed — just be honest.
                </p>
              </div>
            </div>

            <div className={s.stepItem}>
              <div className={s.stepNumber}>2</div>
              <div className={s.stepContent}>
                <h3 className={s.stepContentTitle}>Pick Your Skill Channels</h3>
                <p className={s.stepContentText}>
                  Choose the areas that match your strengths — AI image generation, video editing,
                  voiceover, social content, and more. You can always add new skills later.
                </p>
              </div>
            </div>

            <div className={s.stepItem}>
              <div className={s.stepNumber}>3</div>
              <div className={s.stepContent}>
                <h3 className={s.stepContentTitle}>Complete a Short Training &amp; Test</h3>
                <p className={s.stepContentText}>
                  Each channel has a brief training module and a skill test. This isn&apos;t about gatekeeping —
                  it&apos;s about making sure you understand our quality standards so your work gets approved quickly.
                </p>
              </div>
            </div>

            <div className={s.stepItem}>
              <div className={s.stepNumber}>4</div>
              <div className={s.stepContent}>
                <h3 className={s.stepContentTitle}>Get Access &amp; Start Taking Tasks</h3>
                <p className={s.stepContentText}>
                  Once you pass, you&apos;re in. Browse available tasks in your channels, pick what interests you,
                  and submit your work. Each task has a clear brief, requirements, and a set bounty.
                </p>
              </div>
            </div>

            <div className={s.stepItem}>
              <div className={s.stepNumber}>5</div>
              <div className={s.stepContent}>
                <h3 className={s.stepContentTitle}>Get Paid Monthly</h3>
                <p className={s.stepContentText}>
                  Approved tasks add to your wallet balance. Payouts happen monthly —
                  reliable, transparent, and no chasing invoices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SKILLS WE NEED ===== */}
      <section className={`${s.contentSection} ${s.altBg}`}>
        <div className={s.sectionInner}>
          <div className={s.sectionLabel}>&#127912; What We&apos;re Looking For</div>
          <h2 className={s.sectionTitle}>Skills That <span className={s.gradientText}>Pay</span></h2>
          <p className={s.sectionDescription}>
            If you can do any of these — even as a hobbyist — you&apos;re exactly who we&apos;re looking for.
          </p>

          <div className={s.skillsGrid}>
            <div className={s.skillCard}>
              <div className={s.skillIcon}>&#128444;</div>
              <h3 className={s.skillCardTitle}>AI Image Creation</h3>
              <p className={s.skillCardText}>Midjourney, DALL·E, Stable Diffusion — generate images that look intentional, not accidental.</p>
            </div>
            <div className={s.skillCard}>
              <div className={s.skillIcon}>&#127909;</div>
              <h3 className={s.skillCardTitle}>AI Video Generation</h3>
              <p className={s.skillCardText}>Sora, Runway, Pika — create AI video clips that are smooth, coherent, and on-brief.</p>
            </div>
            <div className={s.skillCard}>
              <div className={s.skillIcon}>&#127910;</div>
              <h3 className={s.skillCardTitle}>Video Editing</h3>
              <p className={s.skillCardText}>Cut, pace, and polish raw footage or AI-generated clips into watchable, engaging content.</p>
            </div>
            <div className={s.skillCard}>
              <div className={s.skillIcon}>&#127908;</div>
              <h3 className={s.skillCardTitle}>Voice &amp; Acting</h3>
              <p className={s.skillCardText}>Voice narration, character acting, or directing AI voice tools to produce natural-sounding audio.</p>
            </div>
            <div className={s.skillCard}>
              <div className={s.skillIcon}>&#9997;</div>
              <h3 className={s.skillCardTitle}>Script &amp; Content Writing</h3>
              <p className={s.skillCardText}>Write or refine scripts, dialogue, educational content, and social media copy.</p>
            </div>
            <div className={s.skillCard}>
              <div className={s.skillIcon}>&#128279;</div>
              <h3 className={s.skillCardTitle}>Social Media Content</h3>
              <p className={s.skillCardText}>Create scroll-stopping posts, reels, and shorts that are optimized for engagement.</p>
            </div>
            <div className={s.skillCard}>
              <div className={s.skillIcon}>&#127925;</div>
              <h3 className={s.skillCardTitle}>Audio &amp; Sound Design</h3>
              <p className={s.skillCardText}>Compose background music, sound effects, or audio landscapes using AI or traditional tools.</p>
            </div>
            <div className={s.skillCard}>
              <div className={s.skillIcon}>&#127760;</div>
              <h3 className={s.skillCardTitle}>Translation &amp; Localization</h3>
              <p className={s.skillCardText}>Adapt content for different languages and cultures — beyond what machine translation can do.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHAT WE BUILD ===== */}
      <section className={s.contentSection}>
        <div className={s.sectionInner}>
          <div className={s.sectionLabel}>&#128230; The Bigger Picture</div>
          <h2 className={s.sectionTitle}>What We&apos;re <span className={s.gradientText}>Building</span></h2>
          <p className={s.sectionDescription}>
            Your individual tasks combine into something much greater than their parts.
          </p>

          <div className={s.visionBlock}>
            <div className={s.puzzleContainer}>
              <div className={`${s.puzzlePiece} ${s.p1}`}>&#128444;<span>Images</span></div>
              <div className={`${s.puzzlePiece} ${s.p2}`}>&#127909;<span>Videos</span></div>
              <div className={`${s.puzzlePiece} ${s.p3}`}>&#127908;<span>Voice</span></div>
              <div className={`${s.puzzlePiece} ${s.p4}`}>&#9997;<span>Scripts</span></div>
              <div className={`${s.puzzlePiece} ${s.p5}`}>&#127925;<span>Audio</span></div>
              <div className={s.puzzleCenter}>
                <span className={s.puzzleCenterIcon}>&#127891;</span>
                <span>Interactive Learning</span>
              </div>
            </div>

            <div>
              <h3 className={s.visionTitle}>Interactive Learning Experiences</h3>
              <p className={s.visionText}>
                We take the images, videos, voiceovers, scripts, and audio that our creators produce —
                and weave them into rich, <strong style={{ color: '#dbdee1' }}>interactive learning products</strong>.
              </p>
              <p className={s.visionText}>
                Think of it like this: a single AI-generated image is nice. A voiceover clip is useful.
                A script is helpful. But when you combine them into an interactive lesson where students
                can explore, listen, watch, and engage — that&apos;s a <strong style={{ color: '#dbdee1' }}>product worth paying for</strong>.
              </p>
              <div className={s.visionPrinciple}>
                <div className={s.principleIcon}>&#8734;</div>
                <div>
                  <strong style={{ color: '#f2f3f5', display: 'block', marginBottom: 4 }}>
                    The whole is worth more than the sum of its parts.
                  </strong>
                  Each piece you create is a building block. Together, they become immersive
                  educational experiences that couldn&apos;t exist without every contributor.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section id="get-started" className={s.ctaSection}>
        <div className={s.ctaInner}>
          <div className={s.ctaGlow} />
          <h2 className={s.ctaTitle}>Ready to Start Earning?</h2>
          <p className={s.ctaSubtitle}>
            Apply now, pick your skills, pass a quick test, and start getting paid for work you already know how to do.
          </p>
          <div className={s.ctaActions}>
            <Link href="/signup" className={s.btnPrimaryLarge}>
              &#9992; Get Started — Sign Up
            </Link>
          </div>
          <div className={s.ctaNote}>
            &#128274; Invite-only for now. We review every application personally.
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className={s.landingFooter}>
        <div className={s.footerInner}>
          <div className={s.footerBrand}>&#9635; Creator Hub</div>
          <div className={s.footerCopy}>Building the future of interactive learning, one creator at a time.</div>
        </div>
      </footer>
    </div>
  );
}
