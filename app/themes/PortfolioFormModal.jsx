import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { motion } from 'framer-motion';

export default function PortfolioFormModal({ isOpen, onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    heroTitle: '',
    heroSubtitle: '',
    heroDescription: '',
    resumeURL: '',
    about: { imageURL: '', paragraphs: [''], skills: [] },
    skills: { Frontend: [], Backend: [], Cloud: [], Databases: [], ML_DS: [], Tools: [], Analytics: [] },
    projects: [],
    qualifications: { work: [], education: [] },
    contact: { email: '', phone: '', links: { linkedin: '', github: '', instagram: '' } },
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleSubmit = () => {
    onSubmit(formData);
    onClose();
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
<Dialog.Panel className="max-w-4xl w-full rounded bg-[#1e1e1e] p-6 text-white shadow-lg">
  <div className="space-y-4">
    <h2 className="text-xl font-semibold">Step {step} - Fill Portfolio Info</h2>

    {/* Step 1: Basic Info */}
    {step === 1 && (
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Full Name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className="w-full px-3 py-2 rounded bg-[#2b2b2b] border border-gray-600"
        />
        <input
          type="text"
          placeholder="Hero Title"
          value={formData.heroTitle}
          onChange={(e) => handleChange('heroTitle', e.target.value)}
          className="w-full px-3 py-2 rounded bg-[#2b2b2b] border border-gray-600"
        />
        <input
          type="text"
          placeholder="Hero Subtitle"
          value={formData.heroSubtitle}
          onChange={(e) => handleChange('heroSubtitle', e.target.value)}
          className="w-full px-3 py-2 rounded bg-[#2b2b2b] border border-gray-600"
        />
      </div>
    )}

    {/* Step 2: Hero Description & Resume */}
    {step === 2 && (
      <div className="space-y-2">
        <textarea
          placeholder="Hero Description"
          value={formData.heroDescription}
          onChange={(e) => handleChange('heroDescription', e.target.value)}
          className="w-full px-3 py-2 rounded bg-[#2b2b2b] border border-gray-600"
        />
        <input
          type="text"
          placeholder="Resume URL"
          value={formData.resumeURL}
          onChange={(e) => handleChange('resumeURL', e.target.value)}
          className="w-full px-3 py-2 rounded bg-[#2b2b2b] border border-gray-600"
        />
      </div>
    )}

    {/* Step 3: About */}
    {step === 3 && (
      <div className="space-y-2">
        <input
          type="text"
          placeholder="About Image URL"
          value={formData.about.imageURL}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              about: { ...prev.about, imageURL: e.target.value },
            }))
          }
          className="w-full px-3 py-2 rounded bg-[#2b2b2b] border border-gray-600"
        />
        <textarea
          placeholder="About Paragraph"
          value={formData.about.paragraphs[0]}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              about: { ...prev.about, paragraphs: [e.target.value] },
            }))
          }
          className="w-full px-3 py-2 rounded bg-[#2b2b2b] border border-gray-600"
        />

        {/* About Skills */}
        {formData.about.skills.map((s, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              placeholder="Skill Title"
              value={s.title}
              onChange={(e) => {
                const updated = [...formData.about.skills];
                updated[i].title = e.target.value;
                setFormData((prev) => ({ ...prev, about: { ...prev.about, skills: updated } }));
              }}
              className="w-1/2 px-2 py-1 rounded bg-[#2b2b2b] border border-gray-600"
            />
            <input
              type="text"
              placeholder="Skill Level"
              value={s.level}
              onChange={(e) => {
                const updated = [...formData.about.skills];
                updated[i].level = e.target.value;
                setFormData((prev) => ({ ...prev, about: { ...prev.about, skills: updated } }));
              }}
              className="w-1/2 px-2 py-1 rounded bg-[#2b2b2b] border border-gray-600"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setFormData((prev) => ({
              ...prev,
              about: { ...prev.about, skills: [...prev.about.skills, { title: '', level: '' }] },
            }))
          }
          className="px-3 py-1 bg-[#00BFA5] rounded"
        >
          + Add Skill
        </button>
      </div>
    )}

    {/* Step 4: Skills */}
    {step === 4 && (
      <div className="space-y-2">
        {Object.keys(formData.skills).map((category) => (
          <div key={category} className="space-y-1">
            <h3 className="font-semibold">{category}</h3>
            {formData.skills[category].map((skill, i) => (
              <input
                key={i}
                type="text"
                placeholder={`${category} Skill`}
                value={skill}
                onChange={(e) => {
                  const updated = [...formData.skills[category]];
                  updated[i] = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    skills: { ...prev.skills, [category]: updated },
                  }));
                }}
                className="w-full px-3 py-2 rounded bg-[#2b2b2b] border border-gray-600"
              />
            ))}
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  skills: { ...prev.skills, [category]: [...prev.skills[category], ''] },
                }))
              }
              className="px-2 py-1 bg-[#00BFA5] rounded text-sm"
            >
              + Add {category} Skill
            </button>
          </div>
        ))}
      </div>
    )}

    {/* Step 5: Projects */}
    {step === 5 && (
      <div className="space-y-2">
        {formData.projects.map((p, i) => (
          <div key={i} className="space-y-1 border p-2 rounded bg-[#2b2b2b]">
            <input
              type="text"
              placeholder="Project Title"
              value={p.title}
              onChange={(e) => {
                const updated = [...formData.projects];
                updated[i].title = e.target.value;
                setFormData((prev) => ({ ...prev, projects: updated }));
              }}
              className="w-full px-2 py-1 rounded bg-[#1e1e1e] border border-gray-600"
            />
            <textarea
              placeholder="Project Description"
              value={p.description}
              onChange={(e) => {
                const updated = [...formData.projects];
                updated[i].description = e.target.value;
                setFormData((prev) => ({ ...prev, projects: updated }));
              }}
              className="w-full px-2 py-1 rounded bg-[#1e1e1e] border border-gray-600"
            />
            <input
              type="text"
              placeholder="Project Technologies (comma separated)"
              value={p.technologies.join(',')}
              onChange={(e) => {
                const updated = [...formData.projects];
                updated[i].technologies = e.target.value.split(',');
                setFormData((prev) => ({ ...prev, projects: updated }));
              }}
              className="w-full px-2 py-1 rounded bg-[#1e1e1e] border border-gray-600"
            />
            <input
              type="text"
              placeholder="Project Link"
              value={p.link}
              onChange={(e) => {
                const updated = [...formData.projects];
                updated[i].link = e.target.value;
                setFormData((prev) => ({ ...prev, projects: updated }));
              }}
              className="w-full px-2 py-1 rounded bg-[#1e1e1e] border border-gray-600"
            />
            <input
              type="text"
              placeholder="Status"
              value={p.status}
              onChange={(e) => {
                const updated = [...formData.projects];
                updated[i].status = e.target.value;
                setFormData((prev) => ({ ...prev, projects: updated }));
              }}
              className="w-full px-2 py-1 rounded bg-[#1e1e1e] border border-gray-600"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setFormData((prev) => ({
              ...prev,
              projects: [...prev.projects, { title: '', description: '', technologies: [], link: '', status: '' }],
            }))
          }
          className="px-3 py-1 bg-[#00BFA5] rounded"
        >
          + Add Project
        </button>
      </div>
    )}

    {/* Step 6: Qualifications */}
    {step === 6 && (
      <div className="space-y-2">
        <h3 className="font-semibold">Work Experience</h3>
        {formData.qualifications.work.map((w, i) => (
          <div key={i} className="space-y-1">
            <input
              type="text"
              placeholder="Title"
              value={w.title}
              onChange={(e) => {
                const updated = [...formData.qualifications.work];
                updated[i].title = e.target.value;
                setFormData((prev) => ({ ...prev, qualifications: { ...prev.qualifications, work: updated } }));
              }}
              className="w-full px-2 py-1 rounded bg-[#2b2b2b] border border-gray-600"
            />
            <input
              type="text"
              placeholder="Company"
              value={w.company}
              onChange={(e) => {
                const updated = [...formData.qualifications.work];
                updated[i].company = e.target.value;
                setFormData((prev) => ({ ...prev, qualifications: { ...prev.qualifications, work: updated } }));
              }}
              className="w-full px-2 py-1 rounded bg-[#2b2b2b] border border-gray-600"
            />
            <input
              type="text"
              placeholder="Period"
              value={w.period}
              onChange={(e) => {
                const updated = [...formData.qualifications.work];
                updated[i].period = e.target.value;
                setFormData((prev) => ({ ...prev, qualifications: { ...prev.qualifications, work: updated } }));
              }}
              className="w-full px-2 py-1 rounded bg-[#2b2b2b] border border-gray-600"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setFormData((prev) => ({
              ...prev,
              qualifications: { ...prev.qualifications, work: [...prev.qualifications.work, { title: '', company: '', period: '' }] },
            }))
          }
          className="px-3 py-1 bg-[#00BFA5] rounded"
        >
          + Add Work
        </button>

        <h3 className="font-semibold mt-4">Education</h3>
        {formData.qualifications.education.map((e, i) => (
          <div key={i} className="space-y-1">
            <input
              type="text"
              placeholder="Title"
              value={e.title}
              onChange={(ev) => {
                const updated = [...formData.qualifications.education];
                updated[i].title = ev.target.value;
                setFormData((prev) => ({ ...prev, qualifications: { ...prev.qualifications, education: updated } }));
              }}
              className="w-full px-2 py-1 rounded bg-[#2b2b2b] border border-gray-600"
            />
            <input
              type="text"
              placeholder="School"
              value={e.school}
              onChange={(ev) => {
                const updated = [...formData.qualifications.education];
                updated[i].school = ev.target.value;
                setFormData((prev) => ({ ...prev, qualifications: { ...prev.qualifications, education: updated } }));
              }}
              className="w-full px-2 py-1 rounded bg-[#2b2b2b] border border-gray-600"
            />
            <input
              type="text"
              placeholder="Period"
              value={e.period}
              onChange={(ev) => {
                const updated = [...formData.qualifications.education];
                updated[i].period = ev.target.value;
                setFormData((prev) => ({ ...prev, qualifications: { ...prev.qualifications, education: updated } }));
              }}
              className="w-full px-2 py-1 rounded bg-[#2b2b2b] border border-gray-600"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setFormData((prev) => ({
              ...prev,
              qualifications: { ...prev.qualifications, education: [...prev.qualifications.education, { title: '', school: '', period: '' }] },
            }))
          }
          className="px-3 py-1 bg-[#00BFA5] rounded"
        >
          + Add Education
        </button>
      </div>
    )}

    {/* Step 7: Contact */}
    {step === 7 && (
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Email"
          value={formData.contact.email}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, contact: { ...prev.contact, email: e.target.value } }))
          }
          className="w-full px-3 py-2 rounded bg-[#2b2b2b] border border-gray-600"
        />
        <input
          type="text"
          placeholder="Phone"
          value={formData.contact.phone}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, contact: { ...prev.contact, phone: e.target.value } }))
          }
          className="w-full px-3 py-2 rounded bg-[#2b2b2b] border border-gray-600"
        />

        <input
          type="text"
          placeholder="LinkedIn URL"
          value={formData.contact.links.linkedin}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              contact: { ...prev.contact, links: { ...prev.contact.links, linkedin: e.target.value } },
            }))
          }
          className="w-full px-3 py-2 rounded bg-[#2b2b2b] border border-gray-600"
        />
        <input
          type="text"
          placeholder="GitHub URL"
          value={formData.contact.links.github}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              contact: { ...prev.contact, links: { ...prev.contact.links, github: e.target.value } },
            }))
          }
          className="w-full px-3 py-2 rounded bg-[#2b2b2b] border border-gray-600"
        />
        <input
          type="text"
          placeholder="Instagram URL"
          value={formData.contact.links.instagram}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              contact: { ...prev.contact, links: { ...prev.contact.links, instagram: e.target.value } },
            }))
          }
          className="w-full px-3 py-2 rounded bg-[#2b2b2b] border border-gray-600"
        />
      </div>
    )}

    {/* Navigation Buttons */}
    <div className="flex justify-between mt-4">
      {step > 1 && (
        <button onClick={prevStep} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
          Previous
        </button>
      )}
      {step < 7 && (
        <button onClick={nextStep} className="px-4 py-2 bg-[#00BFA5] rounded hover:bg-teal-600">
          Next
        </button>
      )}
      {step === 7 && (
        <button onClick={handleSubmit} className="px-4 py-2 bg-[#00BFA5] rounded hover:bg-teal-600">
          Submit
        </button>
      )}
    </div>
  </div>
</Dialog.Panel>

          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
