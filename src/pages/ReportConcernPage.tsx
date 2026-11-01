import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './ReportConcernPage.css'

function ReportConcernPage() {
  const [category, setCategory] = useState('')
  const [blockSection, setBlockSection] = useState('')
  const [description, setDescription] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
const [photoPreview, setPhotoPreview] = useState('')

function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0]

  if (!file) return

  if (!file.type.startsWith('image/')) {
    setMessage('Please select a valid image file.')
    event.target.value = ''
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    setMessage('Photo must not exceed 5 MB.')
    event.target.value = ''
    return
  }

  setSelectedPhoto(file)
  setPhotoPreview(URL.createObjectURL(file))
  setMessage('')
}
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()
  setMessage('')
  setReferenceNumber('')
  setSubmitting(true)

  try {
    const { data: userData, error: userError } =
      await supabase.auth.getUser()

    if (userError || !userData.user) {
      setMessage('Your session has expired. Please log in again.')
      return
    }

    const reference = `CCDI-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`

    let photoPath: string | null = null

    // Upload photo if the student selected one
    if (selectedPhoto) {
      const extension = selectedPhoto.name
        .split('.')
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, '') || 'jpg'

      photoPath = `${userData.user.id}/${reference}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from('concern-photos')
        .upload(photoPath, selectedPhoto, {
          contentType: selectedPhoto.type,
          upsert: false,
        })

      if (uploadError) {
        console.error('Photo upload error:', uploadError)
        setMessage(`Unable to upload photo: ${uploadError.message}`)
        return
      }
    }

    const { error } = await supabase
      .from('concern_reports')
      .insert({
        reference_number: reference,
        user_id: userData.user.id,
        category,
        description: description.trim(),
        block_section: blockSection.trim() || null,
        status: 'Submitted',
        is_anonymous: isAnonymous,
        photo_path: photoPath,
      })

    if (error) {
      console.error('Concern submission error:', error)
      setMessage(`Unable to submit your concern: ${error.message}`)
      return
    }

    setReferenceNumber(reference)
    setMessage('Your concern has been submitted successfully!')
    setCategory('')
    setBlockSection('')
    setDescription('')
    setIsAnonymous(false)
    setSelectedPhoto(null)

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
      setPhotoPreview('')
    }
  } catch {
    setMessage('Something went wrong. Please try again.')
  } finally {
    setSubmitting(false)
  }
}

  return (
    <main className="concern-page">
      <p className="concern-eyebrow">STUDENT PORTAL</p>
      <h1>Report a Concern</h1>
      <p className="concern-subtitle">
        Tell us what happened. Your concern will be handled appropriately.
      </p>

      <form className="concern-form" onSubmit={handleSubmit}>
        <div className="report-identity-section">
  <label>Reporting Identity</label>

  <div className="report-identity-options">
    <label className="report-identity-option">
      <input
        type="radio"
        name="reportIdentity"
        checked={!isAnonymous}
        onChange={() => setIsAnonymous(false)}
      />
      <span>
        <strong>Identified Report</strong>
        <small>Guidance can see your identity.</small>
      </span>
    </label>

    <label className="report-identity-option">
      <input
        type="radio"
        name="reportIdentity"
        checked={isAnonymous}
        onChange={() => setIsAnonymous(true)}
      />
      <span>
        <strong>Anonymous Report</strong>
        <small>Your identity will be hidden from Guidance.</small>
      </span>
    </label>
  </div>
</div>
        <label htmlFor="category">Concern Category</label>
        <select
          id="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          required
        >
          <option value="" disabled>Select a category</option>
          <option value="Bullying or Harassment">Bullying or Harassment</option>
          <option value="Teacher or Staff Concern">Teacher or Staff Concern</option>
          <option value="Classroom or Academic Concern">
            Classroom or Academic Concern
          </option>
          <option value="Facility or Environmental Concern">
            Facility or Environmental Concern
          </option>
          <option value="Safety Concern">Safety Concern</option>
          <option value="Other">Other</option>
        </select>

        <label htmlFor="block">Block / Section (if applicable)</label>
        <input
          id="block"
          value={blockSection}
          onChange={(event) => setBlockSection(event.target.value)}
          placeholder="Enter your block or section"
        />

        <label htmlFor="description">Describe your concern</label>
        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={6}
          placeholder="Please explain what happened..."
          required
        />
        <div className="concern-photo-section">
  <label htmlFor="concern-photo">Attach Photo (Optional)</label>

  <input
    id="concern-photo"
    type="file"
    accept="image/*"
    onChange={handlePhotoChange}
    disabled={submitting}
  />

  <small>Upload one photo only. Maximum file size: 5 MB.</small>

  {photoPreview && (
    <div className="concern-photo-preview">
      <img src={photoPreview} alt="Selected concern attachment" />

      <button
        type="button"
        onClick={() => {
          URL.revokeObjectURL(photoPreview)
          setPhotoPreview('')
          setSelectedPhoto(null)

          const photoInput = document.getElementById(
            'concern-photo'
          ) as HTMLInputElement

          if (photoInput) photoInput.value = ''
        }}
        disabled={submitting}
      >
        Remove Photo
      </button>
    </div>
  )}
</div>

        {message && (
          <p role="status" aria-live="polite">
            {message}
          </p>
        )}

        {referenceNumber && (
          <p>
            Reference Number: <strong>{referenceNumber}</strong>
          </p>
        )}

        <button
          type="submit"
          className="concern-submit"
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Concern'}
        </button>
      </form>
    </main>
  )
}

export default ReportConcernPage