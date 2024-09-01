import React from 'react';
import DarkModeToggle from './components/DarkModeToggle'
import GitHubIcon from './components/GitHubIcon'
import PhoneIcon from './components/PhoneIcon';
import AtIcon from './components/AtIcon';
import GlobeIcon from './components/GlobeIcon';
import clsx from 'clsx';

function App() {
  return (
    <div className="flex flex-col items-center justify-between p-4 md:w-[60%] lg:w-[50%] sm:mx-auto">
      <main className="w-[80%] mt-4">
        <div className="flex flex-col justify-between md:flex-row mb-4">
          <h1 className="text-xl mb-3">Jacob Fenton</h1>
          <div className="w-fit"><DarkModeToggle /></div>
        </div>
        <div className="text-xs">
          <ContactItem Icon={GitHubIcon} label="github profile">
            <a href="https://github.com/asib" target="_blank">github.com/asib</a>
          </ContactItem>
          <ContactItem Icon={PhoneIcon} label="phone number">
            <p>+44 7979 494 508</p>
          </ContactItem>
          <ContactItem Icon={AtIcon} label="email address">
            <a href="mailto:jacob+hiring@dfenton.xyz">jacob+hiring@dfenton.xyz</a>
          </ContactItem>
          <ContactItem Icon={GlobeIcon} label="where I can legally work">
            <p>UK/Canada</p>
          </ContactItem>
        </div>


      </main>
    </div>
  )
}

function ContactItem({ Icon, label, children }: { Icon: ({ }: { className: string }) => JSX.Element, label: string, children: React.ReactNode }) {
  return (
    <div className="flex space-x-2 items-center mb-2">
      <span aria-label={label}><Icon className={clsx("size-4 fill-light-mode-bg dark:fill-dark-mode-bg",
        "stroke-light-mode-text dark:stroke-dark-mode-text")} /></span>
      {children}
    </div>
  )
}

export default App
