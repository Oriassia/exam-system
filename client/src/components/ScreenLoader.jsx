import React, { useEffect, useState } from 'react'
import logo from '../assets/studyWise_logo.png'
import '../styles/ScreenLoader.css'

const LABELS = [
  'Working on it...',
  'Thinking...',
  'Grading your answers...',
  'Almost there...',
  'Reviewing carefully...',
]

function ScreenLoader({ active }) {
  const [labelIndex, setLabelIndex] = useState(0)

  useEffect(() => {
    if (!active) {
      setLabelIndex(0)
      return undefined
    }

    const intervalId = setInterval(() => {
      setLabelIndex((prev) => (prev + 1) % LABELS.length)
    }, 2200)

    return () => clearInterval(intervalId)
  }, [active])

  if (!active) {
    return null
  }

  return (
    <div className="screen-loader" role="status" aria-live="polite" aria-busy="true">
      <div className="screen-loader-content">
        <img
          className="screen-loader-logo"
          src={logo}
          alt="StudyWise"
        />
        <p className="screen-loader-label" key={labelIndex}>
          {LABELS[labelIndex]}
        </p>
      </div>
    </div>
  )
}

export default ScreenLoader
