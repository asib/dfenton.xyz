import React, { useEffect, useRef, useState } from 'react';
import DarkModeToggle from './components/DarkModeToggle'
import GitHubIcon from './components/GitHubIcon'
import PhoneIcon from './components/PhoneIcon';
import AtIcon from './components/AtIcon';
import GlobeIcon from './components/GlobeIcon';
import clsx from 'clsx';
import DocumentCopyIcon from './components/DocumentCopyIcon';
import DocumentCopyTickIcon from './components/DocumentCopyTickIcon';

function App() {
  const workItems = [
    <WorkItem company='Fly.io' location='Remote (UK/Canada)' role='Full Stack Engineer' period='October 2023 - Present'>
      <p>Joined to work on migrating the billing provider of our usage-based billing system from Stripe to Metronome.</p>
      <p>Responsible for the system generating usage events based on data sourced from both Grafana metrics and a Postgres database, storing those events in a time series (TimescaleDB) database, and reliably pushing to Metronome. Wrote a recurring credit granting system for monthly recurring discounts that we needed to reliably and idempotently create.</p>
      <p>Towards the end of the migration, focus shifted to billing & account management product work. I was responsible for making decisions about what to put on our roadmap, based on impact. I implemented our pay-as-you-go plan, region-based pricing, reserved pricing, spot pricing for GPUs. I architected and implemented a Macaroon authnZ framework for our Elixir/Phoenix app. I also designed and oversaw the development of our “unified billing” feature (many organisations billed through the same “parent” entity), a tokens management UI (fast and easy revocation/creation of Macaroon tokens with very specific capabilities), and “granular egress” pricing (charging for bandwidth based on whether the destination was inside/outside of our infrastructure).</p>
    </WorkItem>,
    <WorkItem company='Foodsteps Ltd' location='Remote (UK)' role='Senior Software Engineer' period='March 2020 - October 2023'>
      <p>Food sustainability startup. Full-stack web development utilising: Python/Django/Mypy (backend), TypeScript/React (frontend). Sixth employee and first software hire.</p>
      <p>Built a self-service platform for assessing the carbon footprint of food items, with the ability to customise all stages of the life-cycle per the client's ingredient sourcing/preparation/packaging/end-mile transport/storage. Wrote an impact calculation engine for performing impact assessments asynchronously with Celery, a GraphQL API to service the React frontend and implemented self-service payments using Stripe. Product managed, in collaboration with other engineers on the team; regularly spoke with prospective/active clients to understand core needs and determine what to put on the roadmap.</p>
      <p>Built out all of our infrastructure including: CI pipeline in GitHub Actions, writing repeatable scripts to stand-up a fresh environment in AWS (create log groups, secrets, RDS instance, ECS clusters for our task queue and web server, S3+CloudFront for frontend delivery), and scripts to enable deployment with a single command.</p>
      <p>Responsible for code architecture and establishing/maintaining code hygiene standards, generally during code review. Mentored more junior engineers, often via pair programming, and on-boarded engineers at all levels. Conducted the hiring process for all product engineers.</p>
    </WorkItem>,
    <WorkItem company='The KPH' location='Ladbroke Grove, London, UK' role='Chef de Partie' period='June 2019 - January 2020'>
      <p>Worked on the cold larder and pastry sections. Solely responsible for making bread for the restaurant.</p>
    </WorkItem>,
    <WorkItem company='Cabvision Network Ltd' location='London' role='Software Engineer' period='October 2014 - October 2015, July 2016 - October 2016, September 2018 - June 2019'>
      <p>Payment processing firm. Full-stack web & mobile development. Web stack: PHP (Zend)/jQuery. Mobile stack: Payment polling client/websocket server: Golang, Webhook server: Rust, iOS app: Objective-C and Swift, Android app: Java.</p>
      <p>Created native transaction tracking apps (iOS & Android) featuring real-time transaction push notifications, serving thousands of customers. Transactions were web-scraped from the payment processor's portal by the polling client.</p>
      <p>Expanded functionality of these apps to support processing of payments using a Payworks mPOS device. The app communicated with a London black cab's meter via a custom serial interface to automatically begin the payment flow upon completion of a fare.</p>
    </WorkItem>,
    <WorkItem company='Brevan Howard' location='London, UK' role='Intern' period='August 2014 - September 2014' />,
    <WorkItem company='Surrey Satellite Technology Ltd' location='Guildford, UK' role='Intern' period='Summer 2013' />,
  ].reduce((acc, item) => {
    return (
      <>
        {acc}

        <div className="w-full h-[4rem] ml-8">
          <svg viewBox='0 0 100 100' preserveAspectRatio='none' className="h-full fill-transparent stroke-none">
            <path className='stroke-light-mode-text dark:stroke-dark-mode-text stroke-[0.5rem]' d='M0 0 V 100' strokeDasharray="5 25" strokeLinecap='square' />
          </svg>
        </div>

        {item}
      </>
    );
  })

  return (
    <>
      <div className="fixed top-3 right-4 md:top-4 md:right-6"><DarkModeToggle /></div>
      <div className="flex flex-col items-center justify-between p-4 pb-[3.5rem] md:w-[70%] lg:w-[70%] sm:mx-auto">
        <main className="w-[80%] mt-4 break-words">
          <header className="text-3xl md:text-4xl mb-3">Jacob Fenton</header>

          <section className="text-sm mb-[2rem]">
            <ContactItem Icon={GitHubIcon} label="github profile">
              <a href="https://github.com/asib" target="_blank">github.com/asib</a>
            </ContactItem>
            <ContactItem Icon={PhoneIcon} label="phone number" copyable="+447979494508">
              <a href="tel:+447979494508">+44 7979 494 508</a>
            </ContactItem>
            <ContactItem Icon={AtIcon} label="email address" copyable="jacob+hiring@dfenton.xyz">
              <a href="mailto:jacob+hiring@dfenton.xyz">jacob+hiring@dfenton.xyz</a>
            </ContactItem>
            <ContactItem Icon={GlobeIcon} label="where I can legally work">
              <p>UK/Canada</p>
            </ContactItem>
          </section>

          <details className="group" open>
            <summary className="text-lg -mb-4 group-open:mb-5 cursor-pointer">Experience</summary>
            {workItems}
          </details>

          <details className="group" open>
            <summary className="text-lg mt-5 group-open:mb-5 cursor-pointer">Education</summary>

            <section className="flex flex-col space-y-2 border border-light-mode-text dark:border-dark-mode-text p-4">
              <header className="flex flex-col mb-2">
                <h1 className="text-xl font-semibold mb-[0.25rem]">University of Cambridge</h1>
                <h3 className="text-xs mb-1">Fitzwilliam College</h3>
                <h3 className="text-xs mb-4">October 2015 - July 2018</h3>

                <h2>Computer Science</h2>
                <h2>Class I, BA (Hons)</h2>
              </header>


              <div className="flex flex-col space-y-2 text-sm">
                <p>Dissertation: designed and developed a smart card access control system that implements an authentication protocol based on asymmetric key cryptography, significantly reducing the attack surface as compared to a symmetric key auth system. Written in Java Card/Java.</p>
              </div>
            </section>
          </details>
        </main >
      </div >
    </>
  )
}

function WorkItem({ company, location, role, period, children }: { company: string, location: string, role: string, period: string, children?: React.ReactNode }) {
  return (
    <section className="flex flex-col space-y-2 border border-light-mode-text dark:border-dark-mode-text p-4">
      <header className="flex flex-col mb-2">
        <h1 className="text-xl font-semibold mb-1">{company}</h1>
        <h2 className="text-base mb-2">{role}</h2>
        <h3 className="text-sm mb-1">{location}</h3>
        <h3 className="text-xs">{period}</h3>
      </header>


      <div className="flex flex-col space-y-2 text-sm">{children}</div>
    </section>
  );
}

function ContactItem({ copyable, Icon, label, children }: { copyable?: string, Icon: ({ }: { className: string }) => JSX.Element, label: string, children: React.ReactNode }) {
  const [copySuccess, setCopySuccess] = useState(false);
  const copyToClipboardButtonRef = useRef<HTMLButtonElement>(null);

  const handleCopy = (copyable: string) => {
    navigator.clipboard.writeText(copyable);
    setCopySuccess(true);
  };

  useEffect(() => {
    const handleTransitionEnd = () => {
      if (copyToClipboardButtonRef.current === null) {
        return;
      }

      if (window.getComputedStyle(copyToClipboardButtonRef.current!).opacity === "0") {
        setCopySuccess(false);
      }
    };

    copyToClipboardButtonRef.current?.addEventListener('transitionend', handleTransitionEnd);

    return () => {
      copyToClipboardButtonRef.current?.removeEventListener('transitionend', handleTransitionEnd);
    }
  }, [copyToClipboardButtonRef])

  return (
    <div className="w-fit group flex space-x-2 items-center mb-2" title={label}>
      <Icon className={clsx("size-4 fill-transparent",
        "stroke-light-mode-text dark:stroke-dark-mode-text")} />
      {children}

      {copyable !== undefined &&
        <button ref={copyToClipboardButtonRef} onClick={() => handleCopy(copyable)}
          className={clsx("transition opacity-0 group-hover:opacity-100", {
            "text-light-mode-text dark:text-dark-mode-text": !copySuccess,
            "text-light-mode-highlight dark:text-dark-mode-highlight": copySuccess,
          })}>
          {copySuccess ? <DocumentCopyTickIcon /> : <DocumentCopyIcon />}
        </button>}
    </div>
  )
}

export default App
